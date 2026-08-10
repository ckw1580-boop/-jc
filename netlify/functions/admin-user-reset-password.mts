import type { Config, Context } from '@netlify/functions'

import { requireAdmin } from './_shared/auth.js'
import { apiError, json, readJson, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import { requireSameOrigin } from './_shared/user-auth.js'
import { hashPassword, normalizeUserId, validatePassword, validateUserId } from './_shared/user-security.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') return apiError(context, 405, 'method_not_allowed', '重置密码仅支持 POST 请求。')
  const originError = requireSameOrigin(request, context)
  if (originError) return originError
  const authorization = await requireAdmin(context)
  if ('response' in authorization) return authorization.response

  const userId = normalizeUserId(context.params.userId)
  if (validateUserId(userId)) return apiError(context, 404, 'user_not_found', '未找到该用户。')

  try {
    const body = await readJson(request) as Record<string, unknown>
    const temporaryPassword = typeof body.temporaryPassword === 'string' ? body.temporaryPassword : ''
    const passwordError = validatePassword(temporaryPassword, '临时密码')
    if (passwordError) {
      return apiError(context, 422, 'validation_failed', '临时密码不符合要求。', { temporaryPassword: passwordError })
    }
    const passwordHash = await hashPassword(temporaryPassword)
    const result = await database().pool.query<{ account_status: string }>(
      `UPDATE "YongHuDengLuXingXi"
          SET "密码" = $2, session_version = session_version + 1,
              must_change_password = TRUE, updated_at = NOW()
        WHERE "用户ID" = $1 RETURNING account_status`,
      [userId, passwordHash],
    )
    if (!result.rows[0]) return apiError(context, 404, 'user_not_found', '未找到该用户。')
    return json({ userId, status: result.rows[0].account_status, mustChangePassword: true })
  } catch (error) {
    if (error instanceof TypeError) return apiError(context, 400, 'invalid_json', '请求内容必须是有效的 JSON。')
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/admin/users/:userId/reset-password',
  method: ['POST'],
  rateLimit: { windowLimit: 20, windowSize: 300, aggregateBy: ['domain', 'ip'] },
}
