import type { Config, Context } from '@netlify/functions'

import { apiError, json, unexpectedError } from './_shared/http.js'
import { database, hashUploadToken, readBearerToken } from './_shared/storage.js'
import { requireSiteUser } from './_shared/user-auth.js'
import { isUuid } from './_shared/validation.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') {
    return apiError(context, 405, 'method_not_allowed', '完成接口仅支持 POST 请求。')
  }

  const authorization = await requireSiteUser(request, context)
  if ('response' in authorization) return authorization.response

  const id = context.params.id
  const token = readBearerToken(request)
  if (!isUuid(id) || !token) {
    return apiError(context, 401, 'invalid_upload_token', '上传凭据无效或已过期。')
  }

  try {
    const db = database()
    const rows = await db.sql<{ id: string; submitted_at: string }>`
      UPDATE shujufankui
      SET submission_state = 'submitted', submitted_at = NOW(), upload_token_hash = NULL
      WHERE id = ${id}
        AND submission_state = 'draft'
        AND upload_token_hash = ${hashUploadToken(token)}
      RETURNING id, submitted_at
    `
    const feedback = rows[0]
    if (!feedback) {
      return apiError(context, 409, 'already_completed_or_expired', '反馈已完成提交，或上传凭据已经失效。')
    }
    return json({ id: feedback.id, submittedAt: feedback.submitted_at })
  } catch (error) {
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/feedback/:id/complete',
  method: ['POST'],
  rateLimit: {
    windowLimit: 10,
    windowSize: 180,
    aggregateBy: ['domain', 'ip'],
  },
}
