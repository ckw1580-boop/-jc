import { randomUUID } from 'node:crypto'

import type { Config, Context } from '@netlify/functions'

import { requireAdmin } from './_shared/auth.js'
import { processBlobCleanup } from './_shared/blob-cleanup.js'
import { apiError, json, readJson, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import type { BlobCleanupRow, FeedbackRow, FeedbackUpdateRow } from './_shared/types.js'
import { requireSameOrigin } from './_shared/user-auth.js'
import { isUuid, validateFeedbackUpdate } from './_shared/validation.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') {
    return apiError(context, 405, 'method_not_allowed', '解决反馈接口仅支持 POST 请求。')
  }
  const originError = requireSameOrigin(request, context)
  if (originError) return originError
  const authorization = await requireAdmin(context)
  if ('response' in authorization) return authorization.response

  const id = context.params.id
  if (!isUuid(id)) return apiError(context, 404, 'feedback_not_found', '未找到该反馈。')

  try {
    const validation = validateFeedbackUpdate(await readJson(request))
    if (!validation.data) {
      return apiError(context, 422, 'validation_failed', '请修正公开更新内容。', validation.errors)
    }

    const db = database()
    const client = await db.pool.connect()
    const cleanupItems: Array<Pick<BlobCleanupRow, 'blob_key' | 'source_feedback_id'>> = []
    let update: FeedbackUpdateRow | undefined
    try {
      await client.query('BEGIN')
      const feedbackResult = await client.query<FeedbackRow>(
        `SELECT * FROM shujufankui
          WHERE id = $1 AND submission_state = 'submitted'
          FOR UPDATE`,
        [id],
      )
      const feedback = feedbackResult.rows[0]
      if (!feedback) {
        await client.query('ROLLBACK')
        return apiError(context, 404, 'feedback_not_found', '该反馈不存在或已经处理。')
      }

      const updateResult = await client.query<FeedbackUpdateRow>(
        `INSERT INTO feedback_updates (id, source_feedback_id, title, summary)
         VALUES ($1, $2, $3, $4)
         RETURNING id, source_feedback_id, title, summary, published_at, updated_at`,
        [randomUUID(), id, validation.data.title, validation.data.summary],
      )
      update = updateResult.rows[0]

      for (const attachment of feedback.image_attachments) {
        await client.query(
          `INSERT INTO feedback_blob_cleanup_queue (blob_key, source_feedback_id)
           VALUES ($1, $2)
           ON CONFLICT (blob_key) DO NOTHING`,
          [attachment.blobKey, id],
        )
        cleanupItems.push({ blob_key: attachment.blobKey, source_feedback_id: id })
      }
      await client.query('DELETE FROM shujufankui WHERE id = $1', [id])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    const cleanup = await processBlobCleanup(context, cleanupItems)
    return json({ update, attachmentCleanup: cleanup }, 201)
  } catch (error) {
    if (error instanceof TypeError) {
      return apiError(context, 400, 'invalid_json', '请求内容必须是有效的 JSON。')
    }
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/admin/feedback/:id/resolve',
  method: ['POST'],
}
