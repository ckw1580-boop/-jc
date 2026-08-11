const BASE_URL = 'https://localhost:18443'
const TOKEN_KEY = 's7-plc-gateway-token'

export class PlcGatewayError extends Error {
  constructor(message, { code = 'REAL-GW-001', status = 0, fields = null } = {}) {
    super(message)
    this.name = 'PlcGatewayError'
    this.code = code
    this.status = status
    this.fields = fields
  }
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

async function gatewayRequest(path, options = {}) {
  const headers = new Headers(options.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers, mode: 'cors', cache: 'no-store' })
  } catch {
    throw new PlcGatewayError('未检测到本地 PLC 网关。请安装并启动网关后重试。')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) sessionStorage.removeItem(TOKEN_KEY)
    throw new PlcGatewayError(payload.error?.message || '本地 PLC 网关请求失败。', {
      code: payload.error?.code,
      status: response.status,
      fields: payload.error?.fields,
    })
  }
  return payload
}

function jsonOptions(method, body) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export const plcGateway = {
  hasToken: () => Boolean(getToken()),
  health: () => gatewayRequest('/v1/health'),
  async pair(code) {
    const result = await gatewayRequest('/v1/pair', jsonOptions('POST', { code }))
    sessionStorage.setItem(TOKEN_KEY, result.token)
    return result
  },
  clearToken() { sessionStorage.removeItem(TOKEN_KEY) },
  connect: (profile) => gatewayRequest('/v1/connections', jsonOptions('POST', profile)),
  disconnect: (id) => gatewayRequest(`/v1/connections/${id}`, { method: 'DELETE' }),
  configureTags: (id, tags) => gatewayRequest(`/v1/connections/${id}/tags`, jsonOptions('PUT', { tags })),
  startMonitoring: (id, intervalMs) => gatewayRequest(`/v1/connections/${id}/monitoring`, jsonOptions('POST', { intervalMs })),
  stopMonitoring: (id) => gatewayRequest(`/v1/connections/${id}/monitoring`, { method: 'DELETE' }),
  snapshot: (id) => gatewayRequest(`/v1/connections/${id}/snapshot`),
  heartbeat: (id) => gatewayRequest(`/v1/connections/${id}/heartbeat`, jsonOptions('POST', {})),
  setWriteUnlock: (id, unlocked) => gatewayRequest(`/v1/connections/${id}/write-unlock`, unlocked ? jsonOptions('POST', { confirmed: true }) : { method: 'DELETE' }),
  previewWrite: (id, tagId, value) => gatewayRequest(`/v1/connections/${id}/write-preview`, jsonOptions('POST', { tagId, value })),
  commitWrite: (id, writeToken) => gatewayRequest(`/v1/connections/${id}/write-commit`, jsonOptions('POST', { writeToken })),
}
