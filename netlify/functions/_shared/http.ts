import type { Context } from '@netlify/functions'

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
  requestId?: string
}

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  })
}

export function apiError(
  context: Context,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  const body: ApiErrorBody = {
    error: { code, message, ...(fields ? { fields } : {}) },
    requestId: context.requestId,
  }
  return json(body, status)
}

export function methodNotAllowed(context: Context, allowed: string[]) {
  return apiError(context, 405, 'method_not_allowed', '请求方法不受支持。')
}

export function unexpectedError(context: Context, error: unknown) {
  console.error(`[${context.requestId}] Function failed`, error)
  return apiError(context, 500, 'internal_error', '服务暂时不可用，请稍后重试。')
}

export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new TypeError('Expected application/json')
  }
  return request.json() as Promise<unknown>
}

