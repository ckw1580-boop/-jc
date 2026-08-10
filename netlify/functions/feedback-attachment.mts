import { randomUUID } from 'node:crypto'

import type { Config, Context } from '@netlify/functions'

import { apiError, json, unexpectedError } from './_shared/http.js'
import { database, hashUploadToken, imageStore, readBearerToken } from './_shared/storage.js'
import type { FeedbackAttachment, FeedbackRow } from './_shared/types.js'
import {
  ALLOWED_IMAGE_TYPES,
  isUuid,
  matchesImageSignature,
  MAX_FILES,
  MAX_FILE_SIZE,
  sanitizeFileName,
} from './_shared/validation.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') {
    return apiError(context, 405, 'method_not_allowed', '附件接口仅支持 POST 请求。')
  }

  const id = context.params.id
  const token = readBearerToken(request)
  if (!isUuid(id) || !token) {
    return apiError(context, 401, 'invalid_upload_token', '上传凭据无效或已过期。')
  }

  const contentType = (request.headers.get('content-type') || '').split(';')[0].toLowerCase()
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return apiError(context, 415, 'unsupported_image_type', '仅支持 PNG、JPEG 或 WebP 图片。')
  }

  try {
    const buffer = await request.arrayBuffer()
    const data = new Uint8Array(buffer)
    if (!data.byteLength || data.byteLength > MAX_FILE_SIZE) {
      return apiError(context, 413, 'image_too_large', '图片不能为空且每张不得超过 5 MB。')
    }
    if (!matchesImageSignature(data, contentType)) {
      return apiError(context, 422, 'invalid_image_content', '图片内容与声明的文件格式不匹配。')
    }

    const tokenHash = hashUploadToken(token)
    const db = database()
    const client = await db.pool.connect()
    let attachment: FeedbackAttachment | undefined

    try {
      await client.query('BEGIN')
      const result = await client.query<FeedbackRow>(
        `SELECT * FROM shujufankui
         WHERE id = $1 AND submission_state = 'draft' AND upload_token_hash = $2
         FOR UPDATE`,
        [id, tokenHash],
      )
      const feedback = result.rows[0]
      if (!feedback) {
        await client.query('ROLLBACK')
        return apiError(context, 401, 'invalid_upload_token', '上传凭据无效或已过期。')
      }
      if (feedback.image_attachments.length >= MAX_FILES) {
        await client.query('ROLLBACK')
        return apiError(context, 409, 'attachment_limit_reached', `最多只能上传 ${MAX_FILES} 张图片。`)
      }

      const attachmentId = randomUUID()
      const name = sanitizeFileName(request.headers.get('x-file-name'))
      const uploadedAt = new Date().toISOString()
      const blobKey = `feedback/${id}/${attachmentId}`
      attachment = {
        id: attachmentId,
        blobKey,
        name,
        contentType,
        size: data.byteLength,
        uploadedAt,
      }

      await imageStore(context).set(blobKey, buffer, {
        metadata: { feedbackId: id, attachmentId, name, contentType, size: data.byteLength, uploadedAt },
      })
      const attachments = [...feedback.image_attachments, attachment]
      await client.query(
        'UPDATE shujufankui SET image_attachments = $2::jsonb WHERE id = $1',
        [id, JSON.stringify(attachments)],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      if (attachment) await imageStore(context).delete(attachment.blobKey).catch(() => undefined)
      throw error
    } finally {
      client.release()
    }

    return json({ attachment }, 201)
  } catch (error) {
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/feedback/:id/attachments',
  method: ['POST'],
  rateLimit: {
    windowLimit: 30,
    windowSize: 180,
    aggregateBy: ['domain', 'ip'],
  },
}
