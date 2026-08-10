import type { Config, Context } from '@netlify/functions'

import { requireAdmin } from './_shared/auth.js'
import { apiError, json, readJson, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import { requireSameOrigin } from './_shared/user-auth.js'
import { normalizeUserId, validateUserId } from './_shared/user-security.js'

export default async (request: Request, context: Context) => {
  if (!['PATCH', 'DELETE'].includes(request.method)) {
    return apiError(context, 405, 'method_not_allowed', '用户操作仅支持 PATCH 或 DELETE 请求。')
  }
  const originError = requireSameOrigin(request, context)
  if (originError) return originError
  const authorization = await requireAdmin(context)
  if ('response' in authorization) return authorization.response

  const userId = normalizeUserId(context.params.userId)
  if (validateUserId(userId)) return apiError(context, 404, 'user_not_found', '未找到该用户。')

  try {
    const body = await readJson(request) as Record<string, unknown>
    const db = database()
    if (request.method === 'PATCH') {
      const status = body.status
      if (!['active', 'disabled'].includes(status as string)) {
        return apiError(context, 422, 'validation_failed', '账号状态无效。', { status: '状态必须为 active 或 disabled。' })
      }
      const result = await db.pool.query<{ account_status: string; session_version: number }>(
        `UPDATE "YongHuDengLuXingXi"
            SET account_status = $2,
                session_version = session_version + CASE WHEN $2 = 'disabled' THEN 1 ELSE 0 END,
                updated_at = NOW()
          WHERE "用户ID" = $1
        RETURNING account_status, session_version`,
        [userId, status],
      )
      if (!result.rows[0]) return apiError(context, 404, 'user_not_found', '未找到该用户。')
      return json({ userId, status: result.rows[0].account_status })
    }

    if (normalizeUserId(body.confirmUserId) !== userId) {
      return apiError(context, 422, 'confirmation_mismatch', '请输入完整用户ID以确认删除。', {
        confirmUserId: '确认用户ID不匹配。',
      })
    }
    const result = await db.pool.query('DELETE FROM "YongHuDengLuXingXi" WHERE "用户ID" = $1 RETURNING "用户ID"', [userId])
    if (!result.rows[0]) return apiError(context, 404, 'user_not_found', '未找到该用户。')
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof TypeError) return apiError(context, 400, 'invalid_json', '请求内容必须是有效的 JSON。')
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/admin/users/:userId',
  method: ['PATCH', 'DELETE'],
}
