import type { Config, Context } from '@netlify/functions'

import { apiError, json, unexpectedError } from './_shared/http.js'
import { requireSiteUser } from './_shared/user-auth.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'GET') return apiError(context, 405, 'method_not_allowed', '会话接口仅支持 GET 请求。')
  try {
    const authorization = await requireSiteUser(request, context, { allowMustChange: true })
    if ('response' in authorization) return authorization.response
    const { user } = authorization
    return json({
      user: { userId: user.userId, email: user.email },
      mustChangePassword: user.mustChangePassword,
    })
  } catch (error) {
    return unexpectedError(context, error)
  }
}

export const config: Config = { path: '/api/auth/session', method: ['GET'] }
