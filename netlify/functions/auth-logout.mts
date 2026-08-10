import type { Config, Context } from '@netlify/functions'

import { apiError } from './_shared/http.js'
import { requireSameOrigin } from './_shared/user-auth.js'
import { clearSessionCookie } from './_shared/user-security.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') return apiError(context, 405, 'method_not_allowed', '退出接口仅支持 POST 请求。')
  const originError = requireSameOrigin(request, context)
  if (originError) return originError
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store', 'Set-Cookie': clearSessionCookie(request) },
  })
}

export const config: Config = { path: '/api/auth/logout', method: ['POST'] }
