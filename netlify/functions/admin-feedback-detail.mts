import type { Config, Context } from '@netlify/functions'

import { requireAdmin } from './_shared/auth.js'
import { processBlobCleanup } from './_shared/blob-cleanup.js'
import { apiError, json, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import type { BlobCleanupRow, FeedbackRow } from './_shared/types.js'
import { requireSameOrigin } from './_shared/user-auth.js'
import { isUuid } from './_shared/validation.js'

export default async (request: Request, context: Context) => {
  if (!['GET', 'DELETE'].includes(request.method)) {
    return apiError(context, 405, 'method_not_allowed', '详情接口仅支持 GET 或 DELETE 请求。')
  }
  const authorization = await requireAdmin(context)
  if ('response' in authorization) return authorization.response
  if (request.method === 'DELETE') {
    const originError = requireSameOrigin(request, context)
    if (originError) return originError
  }

  const id = context.params.id
  if (!isUuid(id)) return apiError(context, 404, 'feedback_not_found', '未找到该反馈。')

  try {
    const db = database()
    const result = await db.pool.query<FeedbackRow>(
      `SELECT * FROM shujufankui
       WHERE id = $1 AND submission_state = 'submitted'`,
      [id],
    )
    const feedback = result.rows[0]
    if (!feedback) return apiError(context, 404, 'feedback_not_found', '未找到该反馈。')

    if (request.method === 'GET') {
      return json({ feedback })
    }

    const client = await db.pool.connect()
    const cleanupItems: Array<Pick<BlobCleanupRow, 'blob_key' | 'source_feedback_id'>> = []
    try {
      await client.query('BEGIN')
      const lockedResult = await client.query<FeedbackRow>(
        `SELECT * FROM shujufankui
          WHERE id = $1 AND submission_state = 'submitted'
          FOR UPDATE`,
        [id],
      )
      const lockedFeedback = lockedResult.rows[0]
      if (!lockedFeedback) {
        await client.query('ROLLBACK')
        return apiError(context, 404, 'feedback_not_found', '未找到该反馈。')
      }
      for (const attachment of lockedFeedback.image_attachments) {
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
    await processBlobCleanup(context, cleanupItems)
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/admin/feedback/:id',
  method: ['GET', 'DELETE'],
}
