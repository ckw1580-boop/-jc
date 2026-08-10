import type { Config, Context } from '@netlify/functions'

import { apiError, json, readJson, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import { requireSameOrigin, requireSiteUser } from './_shared/user-auth.js'
import {
  createSessionToken,
  hashPassword,
  serializeSessionCookie,
  validatePasswordChange,
  verifyPassword,
} from './_shared/user-security.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') return apiError(context, 405, 'method_not_allowed', '改密接口仅支持 POST 请求。')
  const originError = requireSameOrigin(request, context)
  if (originError) return originError

  try {
    const authorization = await requireSiteUser(request, context, { allowMustChange: true })
    if ('response' in authorization) return authorization.response
    const validation = validatePasswordChange(await readJson(request))
    if (!validation.data) return apiError(context, 422, 'validation_failed', '请修正密码信息。', validation.errors)

    const db = database()
    const passwordResult = await db.pool.query<{ password_hash: string }>(
      `SELECT "密码" AS password_hash FROM "YongHuDengLuXingXi" WHERE "用户ID" = $1`,
      [authorization.user.userId],
    )
    if (!await verifyPassword(validation.data.currentPassword, passwordResult.rows[0]?.password_hash || '')) {
      return apiError(context, 401, 'invalid_current_password', '当前密码不正确。', { currentPassword: '当前密码不正确。' })
    }

    const passwordHash = await hashPassword(validation.data.newPassword)
    const result = await db.pool.query<{ session_version: number }>(
      `UPDATE "YongHuDengLuXingXi"
          SET "密码" = $2, session_version = session_version + 1,
              must_change_password = FALSE, updated_at = NOW()
        WHERE "用户ID" = $1
      RETURNING session_version`,
      [authorization.user.userId, passwordHash],
    )
    const version = result.rows[0]?.session_version
    if (!version) return apiError(context, 401, 'authentication_required', '当前会话已失效，请重新登录。')
    const token = createSessionToken(authorization.user.userId, version)
    return json({
      user: { userId: authorization.user.userId, email: authorization.user.email },
      mustChangePassword: false,
    }, 200, { 'Set-Cookie': serializeSessionCookie(token, request) })
  } catch (error) {
    if (error instanceof TypeError) return apiError(context, 400, 'invalid_json', '请求内容必须是有效的 JSON。')
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/auth/change-password',
  method: ['POST'],
  rateLimit: { windowLimit: 8, windowSize: 300, aggregateBy: ['domain', 'ip'] },
}
