import type { Config, Context } from '@netlify/functions'

import { apiError, json, readJson, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import { requireSameOrigin, requireSiteUser } from './_shared/user-auth.js'
import {
  createSessionToken,
  hashSessionToken,
  hashPassword,
  sessionExpiresAt,
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

    const passwordHash = await hashPassword(validation.data.newPassword)
    const db = database()
    const client = await db.pool.connect()
    try {
      await client.query('BEGIN')
      const passwordResult = await client.query<{ password_hash: string }>(
        `SELECT "密码" AS password_hash
           FROM "YongHuDengLuXingXi"
          WHERE "用户ID" = $1
          FOR UPDATE`,
        [authorization.user.userId],
      )
      if (!await verifyPassword(validation.data.currentPassword, passwordResult.rows[0]?.password_hash || '')) {
        await client.query('ROLLBACK')
        return apiError(context, 401, 'invalid_current_password', '当前密码不正确。', { currentPassword: '当前密码不正确。' })
      }

      const result = await client.query<{ session_version: number }>(
        `UPDATE "YongHuDengLuXingXi"
            SET "密码" = $2, session_version = session_version + 1,
                must_change_password = FALSE, updated_at = NOW()
          WHERE "用户ID" = $1
        RETURNING session_version`,
        [authorization.user.userId, passwordHash],
      )
      const version = result.rows[0]?.session_version
      if (!version) {
        await client.query('ROLLBACK')
        return apiError(context, 401, 'authentication_required', '当前会话已失效，请重新登录。')
      }

      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [authorization.user.userId])
      const token = createSessionToken()
      await client.query(
        `INSERT INTO user_sessions (token_hash, user_id, session_version, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [hashSessionToken(token), authorization.user.userId, version, sessionExpiresAt()],
      )
      await client.query('COMMIT')
      return json({
        user: { userId: authorization.user.userId, email: authorization.user.email },
        mustChangePassword: false,
      }, 200, { 'Set-Cookie': serializeSessionCookie(token, request) })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
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
