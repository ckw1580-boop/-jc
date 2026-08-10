import type { Config, Context } from '@netlify/functions'

import { requireAdmin } from './_shared/auth.js'
import { apiError, unexpectedError } from './_shared/http.js'
import { database, imageStore } from './_shared/storage.js'
import type { FeedbackAttachment, FeedbackRow } from './_shared/types.js'
import { isUuid } from './_shared/validation.js'

function contentDisposition(name: string, download: boolean) {
  const asciiName = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'attachment'
  const mode = download ? 'attachment' : 'inline'
  return `${mode}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export default async (request: Request, context: Context) => {
  if (request.method !== 'GET') {
    return apiError(context, 405, 'method_not_allowed', '附件读取仅支持 GET 请求。')
  }
  const authorization = await requireAdmin(context)
  if ('response' in authorization) return authorization.response

  const id = context.params.id
  const attachmentId = context.params.attachmentId
  if (!isUuid(id) || !isUuid(attachmentId)) {
    return apiError(context, 404, 'attachment_not_found', '未找到该附件。')
  }

  try {
    const db = database()
    const result = await db.pool.query<Pick<FeedbackRow, 'image_attachments'>>(
      `SELECT image_attachments FROM shujufankui
       WHERE id = $1 AND submission_state = 'submitted'`,
      [id],
    )
    const attachment = result.rows[0]?.image_attachments.find(
      (item: FeedbackAttachment) => item.id === attachmentId,
    )
    if (!attachment) return apiError(context, 404, 'attachment_not_found', '未找到该附件。')

    const stream = await imageStore(context).get(attachment.blobKey, { type: 'stream' })
    if (!stream) return apiError(context, 404, 'attachment_not_found', '附件文件已经不存在。')
    const download = new URL(request.url).searchParams.get('download') === '1'

    return new Response(stream, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': contentDisposition(attachment.name, download),
        'Content-Type': attachment.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/admin/feedback/:id/attachments/:attachmentId',
  method: ['GET'],
}
