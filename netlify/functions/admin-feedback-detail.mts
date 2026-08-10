import type { Config, Context } from '@netlify/functions'

import { requireAdmin } from './_shared/auth.js'
import { apiError, json, unexpectedError } from './_shared/http.js'
import { database, imageStore } from './_shared/storage.js'
import type { FeedbackRow } from './_shared/types.js'
import { isUuid } from './_shared/validation.js'

export default async (request: Request, context: Context) => {
  if (!['GET', 'DELETE'].includes(request.method)) {
    return apiError(context, 405, 'method_not_allowed', '详情接口仅支持 GET 或 DELETE 请求。')
  }
  const authorization = await requireAdmin(context)
  if ('response' in authorization) return authorization.response

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

    for (const attachment of feedback.image_attachments) {
      await imageStore(context).delete(attachment.blobKey)
    }
    await db.pool.query('DELETE FROM shujufankui WHERE id = $1', [id])
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/admin/feedback/:id',
  method: ['GET', 'DELETE'],
}
