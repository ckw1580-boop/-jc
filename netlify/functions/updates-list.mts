import type { Config, Context } from '@netlify/functions'

import { apiError, json, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import { requireSiteUser } from './_shared/user-auth.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'GET') {
    return apiError(context, 405, 'method_not_allowed', '更新信息接口仅支持 GET 请求。')
  }

  try {
    const authorization = await requireSiteUser(request, context)
    if ('response' in authorization) return authorization.response

    const url = new URL(request.url)
    const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
    const requestedPageSize = Number.parseInt(url.searchParams.get('pageSize') || '20', 10)
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1
    const pageSize = Number.isFinite(requestedPageSize) ? Math.min(100, Math.max(1, requestedPageSize)) : 20
    const offset = (page - 1) * pageSize
    const db = database()

    const [countResult, result] = await Promise.all([
      db.pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM feedback_updates'),
      db.pool.query(
        `SELECT id, title, summary, published_at, updated_at
           FROM feedback_updates
          ORDER BY published_at DESC, id DESC
          LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      ),
    ])

    return json({
      items: result.rows,
      total: Number.parseInt(countResult.rows[0]?.total || '0', 10),
      page,
      pageSize,
    })
  } catch (error) {
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/updates',
  method: ['GET'],
}
