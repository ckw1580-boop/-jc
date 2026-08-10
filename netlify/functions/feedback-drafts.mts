import { randomUUID } from 'node:crypto'

import type { Config, Context } from '@netlify/functions'

import { apiError, json, readJson, unexpectedError } from './_shared/http.js'
import { createUploadToken, database, hashUploadToken } from './_shared/storage.js'
import { requireSiteUser } from './_shared/user-auth.js'
import { MAX_FILES, validateDraft } from './_shared/validation.js'

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') {
    return apiError(context, 405, 'method_not_allowed', '草稿接口仅支持 POST 请求。')
  }

  try {
    const authorization = await requireSiteUser(request, context)
    if ('response' in authorization) return authorization.response
    const validation = validateDraft(await readJson(request))
    if (!validation.data) {
      return apiError(context, 422, 'validation_failed', '请修正表单中的错误。', validation.errors)
    }

    const id = randomUUID()
    const uploadToken = createUploadToken()
    const tokenHash = hashUploadToken(uploadToken)
    const db = database()
    const { contact, phone, email, description } = validation.data

    await db.sql`
      INSERT INTO shujufankui (
        id, contact_name, contact_phone, email, description, upload_token_hash
      ) VALUES (
        ${id}, ${contact}, ${phone}, ${email}, ${description}, ${tokenHash}
      )
    `

    return json({ id, uploadToken, maxFiles: MAX_FILES }, 201)
  } catch (error) {
    if (error instanceof TypeError) {
      return apiError(context, 400, 'invalid_json', '请求内容必须是有效的 JSON。')
    }
    return unexpectedError(context, error)
  }
}

export const config: Config = {
  path: '/api/feedback/drafts',
  method: ['POST'],
  rateLimit: {
    windowLimit: 5,
    windowSize: 180,
    aggregateBy: ['domain', 'ip'],
  },
}

