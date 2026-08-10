export class ApiError extends Error {
  constructor(message, { status = 0, code = 'request_failed', fields, requestId } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.requestId = requestId
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 204) return null
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json() : null

  if (!response.ok) {
    throw new ApiError(body?.error?.message || `请求失败（${response.status}）`, {
      status: response.status,
      code: body?.error?.code,
      fields: body?.error?.fields,
      requestId: body?.requestId,
    })
  }
  return body
}

