import type { Config, Context } from '@netlify/functions'

import { requireAdmin } from './_shared/auth.js'
import { apiError, json, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'GET') {
    return apiError(context, 405, 'method_not_allowed', '更新信息管理接口仅支持 GET 请求。')
  }
  const authorization = await requireAdmin(context)
  if ('response' in authorization) return authorization.response

  try {
    const url = new URL(request.url)
    const query = (url.searchParams.get('query') || '').trim().slice(0, 100)
    const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
    const requestedPageSize = Number.parseInt(url.searchParams.get('pageSize') || '20', 10)
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1
    const pageSize = Number.isFinite(requestedPageSize) ? Math.min(100, Math.max(1, requestedPageSize)) : 20
    const offset = (page - 1) * pageSize
    const pattern = `%${query}%`
    const db = database()

    const [countResult, result] = await Promise.all([
      db.pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM feedback_updates
          WHERE $1 = '' OR title ILIKE $2 OR summary ILIKE $2`,
        [query, pattern],
      ),
      db.pool.query(
        `SELECT id, source_feedback_id, title, summary, published_at, updated_at
           FROM feedback_updates
          WHERE $1 = '' OR title ILIKE $2 OR summary ILIKE $2
          ORDER BY published_at DESC, id DESC
          LIMIT $3 OFFSET $4`,
        [query, pattern, pageSize, offset],
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
  path: '/api/admin/updates',
  method: ['GET'],
}
