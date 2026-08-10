import type { Config, Context } from '@netlify/functions'

import { requireAdmin } from './_shared/auth.js'
import { apiError, json, readJson, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import type { FeedbackUpdateRow } from './_shared/types.js'
import { requireSameOrigin } from './_shared/user-auth.js'
import { isUuid, validateFeedbackUpdate } from './_shared/validation.js'

export default async (request: Request, context: Context) => {
  if (!['PATCH', 'DELETE'].includes(request.method)) {
    return apiError(context, 405, 'method_not_allowed', '更新信息操作仅支持 PATCH 或 DELETE 请求。')
  }
  const originError = requireSameOrigin(request, context)
  if (originError) return originError
  const authorization = await requireAdmin(context)
  if ('response' in authorization) return authorization.response

  const id = context.params.id
  if (!isUuid(id)) return apiError(context, 404, 'update_not_found', '未找到该更新信息。')

  try {
    const db = database()
    if (request.method === 'DELETE') {
      const result = await db.pool.query('DELETE FROM feedback_updates WHERE id = $1 RETURNING id', [id])
      if (!result.rows[0]) return apiError(context, 404, 'update_not_found', '未找到该更新信息。')
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
    }

    const validation = validateFeedbackUpdate(await readJson(request))
    if (!validation.data) {
      return apiError(context, 422, 'validation_failed', '请修正公开更新内容。', validation.errors)
    }
    const result = await db.pool.query<FeedbackUpdateRow>(
      `UPDATE feedback_updates
          SET title = $2, summary = $3, updated_at = NOW()
        WHERE id = $1
      RETURNING id, source_feedback_id, title, summary, published_at, updated_at`,
      [id, validation.data.title, validation.data.summary],
    )
    if (!result.rows[0]) return apiError(context, 404, 'update_not_found', '未找到该更新信息。')
    return json({ update: result.rows[0] })
  } catch (error) {
    if (error instanceof TypeError) {
      return apiError(context, 400, 'invalid_json', '请求内容必须是有效的 JSON。')
    }
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/admin/updates/:id',
  method: ['PATCH', 'DELETE'],
}
