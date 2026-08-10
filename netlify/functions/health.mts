import type { Config, Context } from '@netlify/functions'

import { apiError, json } from './_shared/http.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'GET') {
    return apiError(context, 405, 'method_not_allowed', '健康检查仅支持 GET 请求。')
  }
  return json({ status: 'ok', service: 'Netlify Functions', framework: 'Netlify' })
}

export const config: Config = {
  path: '/api/health',
  method: ['GET'],
}

