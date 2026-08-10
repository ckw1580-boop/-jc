import type { Context } from '@netlify/functions'

import { apiError } from './http.js'
import { database } from './storage.js'
import { hashSessionToken, readCookie } from './user-security.js'

export interface SiteUser {
  userId: string
  email: string
  status: 'active' | 'disabled'
  sessionVersion: number
  mustChangePassword: boolean
}

interface UserRow {
  user_id: string
  email: string
  account_status: 'active' | 'disabled'
  session_version: number
  must_change_password: boolean
}

export function requireSameOrigin(request: Request, context: Context) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return apiError(context, 403, 'invalid_origin', '请求来源无效，请刷新页面后重试。')
  }
  return null
}

export async function getSiteUser(request: Request): Promise<SiteUser | null> {
  const token = readCookie(request)
  if (!token) return null

  const result = await database().pool.query<UserRow>(
    `SELECT users."用户ID" AS user_id, users."邮箱" AS email,
            users.account_status, users.session_version, users.must_change_password
       FROM user_sessions sessions
       JOIN "YongHuDengLuXingXi" users ON users."用户ID" = sessions.user_id
      WHERE sessions.token_hash = $1
        AND sessions.expires_at > NOW()
        AND sessions.session_version = users.session_version`,
    [hashSessionToken(token)],
  )
  const row = result.rows[0]
  if (!row || row.account_status !== 'active') return null
  return {
    userId: row.user_id,
    email: row.email,
    status: row.account_status,
    sessionVersion: row.session_version,
    mustChangePassword: row.must_change_password,
  }
}

export async function requireSiteUser(
  request: Request,
  context: Context,
  options: { allowMustChange?: boolean } = {},
) {
  const user = await getSiteUser(request)
  if (!user) {
    return { response: apiError(context, 401, 'authentication_required', '请先登录后再继续。') }
  }
  if (user.mustChangePassword && !options.allowMustChange) {
    return { response: apiError(context, 403, 'password_change_required', '请先修改临时密码。') }
  }
  return { user }
}
