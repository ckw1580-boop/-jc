import { randomUUID } from 'node:crypto'
import https from 'node:https'

import { validateConnectionProfile, validateTagCollection } from './address.js'
import { NodeS7Adapter } from './plc-adapter.js'
import { originAllowed, PairingManager } from './security.js'

const BODY_LIMIT = 1024 * 1024

function send(response, status, body, origin = '') {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(originAllowed(origin) ? {
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
    } : {}),
  })
  response.end(JSON.stringify(body))
}

function errorResponse(response, error, origin, requestId) {
  send(response, error.status || 500, {
    error: { code: error.code || 'REAL-GW-500', message: error.message || '本地网关内部错误。', ...(error.fields ? { fields: error.fields } : {}) },
    requestId,
  }, origin)
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > BODY_LIMIT) throw Object.assign(new Error('请求体过大。'), { code: 'REAL-GW-400', status: 413 })
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw Object.assign(new Error('请求 JSON 无效。'), { code: 'REAL-GW-400', status: 400 }) }
}

function bearerToken(request) {
  const match = String(request.headers.authorization || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

export function createGatewayController({
  version = '0.1.0',
  pairing = new PairingManager(),
  adapterFactory = (options) => new NodeS7Adapter(options),
  logger = () => undefined,
  now = () => Date.now(),
} = {}) {
  const connections = new Map()

  async function removeConnection(token) {
    const connection = connections.get(token)
    if (!connection) return
    connections.delete(token)
    await connection.adapter.disconnect().catch(() => undefined)
    logger('disconnect', { connectionId: connection.id, ip: connection.profile.ip })
  }

  const watchdog = setInterval(() => {
    for (const [token, connection] of connections) {
      if (now() - connection.lastHeartbeat > 15000) removeConnection(token)
    }
  }, 5000)
  watchdog.unref?.()

  async function handler(request, response) {
    const requestId = randomUUID()
    const origin = String(request.headers.origin || '')
    if (request.method === 'OPTIONS') {
      if (!originAllowed(origin)) return errorResponse(response, Object.assign(new Error('网页来源不受信任。'), { code: 'REAL-GW-003', status: 403 }), origin, requestId)
      response.writeHead(204, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization,Content-Type',
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin, Access-Control-Request-Private-Network',
      })
      return response.end()
    }

    try {
      const url = new URL(request.url, 'https://localhost:18443')
      if (request.method === 'GET' && url.pathname === '/v1/health') {
        return send(response, 200, { ready: true, version, service: 's7-control-plc-gateway', connections: connections.size }, origin)
      }
      if (request.method === 'POST' && url.pathname === '/v1/pair') {
        const body = await readJson(request)
        return send(response, 200, pairing.pair(body.code, origin), origin)
      }

      if (!originAllowed(origin)) throw Object.assign(new Error('网页来源不受信任。'), { code: 'REAL-GW-003', status: 403 })
      const token = bearerToken(request)
      pairing.authenticate(token, origin)

      if (request.method === 'POST' && url.pathname === '/v1/connections') {
        const profile = await readJson(request)
        const fields = validateConnectionProfile(profile)
        if (Object.keys(fields).length) throw Object.assign(new Error('实际连接参数无效。'), { code: 'REAL-S7-001', status: 400, fields })
        await removeConnection(token)
        const adapter = adapterFactory({ logger })
        await adapter.connect(profile)
        const connection = { id: randomUUID(), adapter, profile, lastHeartbeat: now(), monitoring: false, writeUnlocked: false }
        connections.set(token, connection)
        logger('connect', { connectionId: connection.id, series: profile.series, ip: profile.ip, rack: profile.rack, slot: profile.slot })
        return send(response, 201, { connectionId: connection.id, quality: '已连接', message: `${profile.series} 实际 S7 会话已建立。` }, origin)
      }

      const match = url.pathname.match(/^\/v1\/connections\/([0-9a-f-]+)(?:\/(tags|monitoring|snapshot|write-unlock|write-preview|write-commit|heartbeat))?$/i)
      if (!match) throw Object.assign(new Error('接口不存在。'), { code: 'REAL-GW-404', status: 404 })
      const connection = connections.get(token)
      if (!connection || connection.id !== match[1]) throw Object.assign(new Error('实际 PLC 连接不存在或已超时。'), { code: 'REAL-NET-001', status: 404 })
      connection.lastHeartbeat = now()
      const action = match[2]

      if (request.method === 'DELETE' && !action) {
        await removeConnection(token)
        return send(response, 200, { disconnected: true }, origin)
      }
      if (request.method === 'PUT' && action === 'tags') {
        const { tags } = await readJson(request)
        const fields = validateTagCollection(tags)
        if (Object.keys(fields).length) throw Object.assign(new Error('实际变量配置无效。'), { code: 'REAL-ADDR-001', status: 400, fields })
        connection.adapter.configureTags(tags)
        connection.monitoring = false
        connection.writeUnlocked = false
        return send(response, 200, { configured: tags.length }, origin)
      }
      if (request.method === 'POST' && action === 'monitoring') {
        const { intervalMs } = await readJson(request)
        if (![500, 1000, 2000].includes(intervalMs)) throw Object.assign(new Error('刷新周期必须为 500、1000 或 2000 毫秒。'), { code: 'REAL-ADDR-001', status: 400 })
        connection.adapter.monitoring = true
        connection.monitoring = true
        connection.writeUnlocked = false
        return send(response, 200, { monitoring: true, intervalMs }, origin)
      }
      if (request.method === 'DELETE' && action === 'monitoring') {
        connection.adapter.monitoring = false
        connection.monitoring = false
        connection.writeUnlocked = false
        return send(response, 200, { monitoring: false }, origin)
      }
      if (request.method === 'GET' && action === 'snapshot') {
        return send(response, 200, await connection.adapter.readSnapshot(), origin)
      }
      if (request.method === 'POST' && action === 'write-unlock') {
        const { confirmed } = await readJson(request)
        if (!connection.monitoring || confirmed !== true) throw Object.assign(new Error('写入联锁确认无效。'), { code: 'REAL-WRITE-001', status: 409 })
        connection.writeUnlocked = true
        return send(response, 200, { writeUnlocked: true }, origin)
      }
      if (request.method === 'DELETE' && action === 'write-unlock') {
        connection.writeUnlocked = false
        return send(response, 200, { writeUnlocked: false }, origin)
      }
      if (request.method === 'POST' && action === 'write-preview') {
        if (!connection.writeUnlocked) throw Object.assign(new Error('实际写入尚未在本地网关解锁。'), { code: 'REAL-WRITE-001', status: 423 })
        const { tagId, value } = await readJson(request)
        return send(response, 200, await connection.adapter.previewWrite(tagId, value), origin)
      }
      if (request.method === 'POST' && action === 'write-commit') {
        if (!connection.writeUnlocked) throw Object.assign(new Error('实际写入尚未在本地网关解锁。'), { code: 'REAL-WRITE-001', status: 423 })
        const { writeToken } = await readJson(request)
        return send(response, 200, await connection.adapter.commitWrite(writeToken), origin)
      }
      if (request.method === 'POST' && action === 'heartbeat') return send(response, 200, { alive: true }, origin)
      throw Object.assign(new Error('请求方法不受支持。'), { code: 'REAL-GW-405', status: 405 })
    } catch (error) {
      logger('error', { requestId, code: error.code || 'REAL-GW-500', message: error.message })
      return errorResponse(response, error, origin, requestId)
    }
  }

  return {
    handler,
    pairing,
    connectionCount: () => connections.size,
    async close() {
      clearInterval(watchdog)
      await Promise.all([...connections.keys()].map(removeConnection))
    },
  }
}

export function createGatewayServer({ tls, ...options }) {
  const controller = createGatewayController(options)
  const server = https.createServer(tls, controller.handler)
  return {
    ...controller,
    listen(port = 18443, host = '127.0.0.1') {
      return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, () => { server.off('error', reject); resolve() })
      })
    },
    async close() {
      await controller.close()
      await new Promise((resolve) => server.close(() => resolve()))
    },
  }
}
