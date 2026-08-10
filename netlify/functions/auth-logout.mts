import type { Config, Context } from '@netlify/functions'

import { apiError, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import { requireSameOrigin } from './_shared/user-auth.js'
import { clearSessionCookie, hashSessionToken, readCookie } from './_shared/user-security.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') return apiError(context, 405, 'method_not_allowed', '退出接口仅支持 POST 请求。')
  const originError = requireSameOrigin(request, context)
  if (originError) return originError
  try {
    const token = readCookie(request)
    if (token) {
      await database().pool.query('DELETE FROM user_sessions WHERE token_hash = $1', [hashSessionToken(token)])
    }
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store', 'Set-Cookie': clearSessionCookie(request) },
    })
  } catch (error) {
    return unexpectedError(context, error)
  }
}

export const config: Config = { path: '/api/auth/logout', method: ['POST'] }
