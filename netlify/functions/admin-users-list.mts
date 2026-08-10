import type { Config, Context } from '@netlify/functions'

import { requireAdmin } from './_shared/auth.js'
import { apiError, json, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'

interface UserListRow {
  user_id: string
  email: string
  account_status: 'active' | 'disabled'
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export default async (request: Request, context: Context) => {
  if (request.method !== 'GET') return apiError(context, 405, 'method_not_allowed', '用户列表仅支持 GET 请求。')
  const authorization = await requireAdmin(context)
  if ('response' in authorization) return authorization.response

  try {
    const url = new URL(request.url)
    const query = (url.searchParams.get('query') || '').trim().toLowerCase().slice(0, 100)
    const parsedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
    const parsedPageSize = Number.parseInt(url.searchParams.get('pageSize') || '20', 10)
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1
    const pageSize = Number.isFinite(parsedPageSize) ? Math.min(100, Math.max(1, parsedPageSize)) : 20
    const offset = (page - 1) * pageSize
    const pattern = `%${query}%`
    const db = database()

    const [countResult, result] = await Promise.all([
      db.pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM "YongHuDengLuXingXi"
          WHERE ($1 = '' OR "用户ID" ILIKE $2 OR "邮箱" ILIKE $2)`,
        [query, pattern],
      ),
      db.pool.query<UserListRow>(
        `SELECT "用户ID" AS user_id, "邮箱" AS email, account_status,
                must_change_password, created_at, updated_at
           FROM "YongHuDengLuXingXi"
          WHERE ($1 = '' OR "用户ID" ILIKE $2 OR "邮箱" ILIKE $2)
          ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [query, pattern, pageSize, offset],
      ),
    ])

    return json({
      items: result.rows.map((row: UserListRow) => ({
        userId: row.user_id,
        email: row.email,
        status: row.account_status,
        mustChangePassword: row.must_change_password,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      total: Number.parseInt(countResult.rows[0]?.total || '0', 10),
      page,
      pageSize,
    })
  } catch (error) {
    return unexpectedError(context, error)
  }
}

export const config: Config = { path: '/api/admin/users', method: ['GET'] }
