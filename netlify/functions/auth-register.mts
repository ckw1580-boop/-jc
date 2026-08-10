import type { Config, Context } from '@netlify/functions'

import { apiError, json, readJson, unexpectedError } from './_shared/http.js'
import { database } from './_shared/storage.js'
import { hashPassword, validateRegistration } from './_shared/user-security.js'
import { requireSameOrigin } from './_shared/user-auth.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') return apiError(context, 405, 'method_not_allowed', '注册接口仅支持 POST 请求。')
  const originError = requireSameOrigin(request, context)
  if (originError) return originError

  try {
    const validation = validateRegistration(await readJson(request))
    if (!validation.data) return apiError(context, 422, 'validation_failed', '请修正注册信息。', validation.errors)
    const { userId, email, password } = validation.data
    const db = database()
    const conflict = await db.pool.query<{ user_id: string | null; email: string | null }>(
      `SELECT MAX(CASE WHEN "用户ID" = $1 THEN "用户ID" END) AS user_id,
              MAX(CASE WHEN LOWER("邮箱") = $2 THEN "邮箱" END) AS email
         FROM "YongHuDengLuXingXi"
        WHERE "用户ID" = $1 OR LOWER("邮箱") = $2`,
      [userId, email],
    )
    const fields: Record<string, string> = {}
    if (conflict.rows[0]?.user_id) fields.userId = '该用户ID已被注册。'
    if (conflict.rows[0]?.email) fields.email = '该邮箱已被注册。'
    if (Object.keys(fields).length) return apiError(context, 409, 'account_conflict', '用户ID或邮箱已存在。', fields)

    const passwordHash = await hashPassword(password)
    await db.pool.query(
      `INSERT INTO "YongHuDengLuXingXi" ("用户ID", "密码", "邮箱") VALUES ($1, $2, $3)`,
      [userId, passwordHash, email],
    )
    return json({ user: { userId, email } }, 201)
  } catch (error) {
    if (error instanceof TypeError) return apiError(context, 400, 'invalid_json', '请求内容必须是有效的 JSON。')
    if ((error as { code?: string })?.code === '23505') {
      return apiError(context, 409, 'account_conflict', '用户ID或邮箱已存在。')
    }
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/auth/register',
  method: ['POST'],
  rateLimit: { windowLimit: 5, windowSize: 300, aggregateBy: ['domain', 'ip'] },
}
