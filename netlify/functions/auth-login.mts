import type { Config, Context } from '@netlify/functions'

import { apiError, json, readJson, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import {
  createSessionToken,
  serializeSessionCookie,
  validateLogin,
  verifyPassword,
} from './_shared/user-security.js'
import { requireSameOrigin } from './_shared/user-auth.js'

interface LoginRow {
  user_id: string
  email: string
  password_hash: string
  account_status: 'active' | 'disabled'
  session_version: number
  must_change_password: boolean
}

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') return apiError(context, 405, 'method_not_allowed', '登录接口仅支持 POST 请求。')
  const originError = requireSameOrigin(request, context)
  if (originError) return originError

  try {
    const validation = validateLogin(await readJson(request))
    if (!validation.data) return apiError(context, 422, 'validation_failed', '请修正登录信息。', validation.errors)
    const { userId, password } = validation.data
    const result = await database().pool.query<LoginRow>(
      `SELECT "用户ID" AS user_id, "邮箱" AS email, "密码" AS password_hash,
              account_status, session_version, must_change_password
         FROM "YongHuDengLuXingXi" WHERE "用户ID" = $1`,
      [userId],
    )
    const row = result.rows[0]
    const valid = row ? await verifyPassword(password, row.password_hash) : false
    if (!row || !valid) return apiError(context, 401, 'invalid_credentials', '用户ID或密码不正确。')
    if (row.account_status === 'disabled') return apiError(context, 403, 'account_disabled', '该账号已被管理员禁用。')

    const token = createSessionToken(row.user_id, row.session_version)
    return json({
      user: { userId: row.user_id, email: row.email },
      mustChangePassword: row.must_change_password,
    }, 200, { 'Set-Cookie': serializeSessionCookie(token, request) })
  } catch (error) {
    if (error instanceof TypeError) return apiError(context, 400, 'invalid_json', '请求内容必须是有效的 JSON。')
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/auth/login',
  method: ['POST'],
  rateLimit: { windowLimit: 10, windowSize: 300, aggregateBy: ['domain', 'ip'] },
}
