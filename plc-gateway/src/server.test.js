import http from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PairingManager } from './security.js'
import { createGatewayController } from './server.js'

class FakeAdapter {
  async connect(profile) { this.profile = profile }
  configureTags(tags) { this.tags = tags }
  async readSnapshot() { return { quality: '良好', cycleTimeMs: 3, timestamp: new Date(0).toISOString(), tags: this.tags.map((tag) => ({ id: tag.id, value: tag.dataType === 'BOOL', quality: 'good', timestamp: new Date(0).toISOString() })) } }
  async previewWrite(tagId, value) { return { writeToken: 'write-token', oldValue: false, newValue: value, expiresAt: new Date(Date.now() + 30000).toISOString(), tagId } }
  async commitWrite(writeToken) { return { verified: true, writeToken, value: true } }
  async disconnect() { this.disconnected = true }
}

describe('localhost 网关 API 合约', () => {
  let controller
  let server
  let baseUrl
  const origin = 'http://localhost:5173'

  beforeEach(async () => {
    controller = createGatewayController({
      pairing: new PairingManager({ codeFactory: () => '123456' }),
      adapterFactory: () => new FakeAdapter(),
    })
    server = http.createServer(controller.handler)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  afterEach(async () => {
    await controller.close()
    await new Promise((resolve) => server.close(resolve))
  })

  async function request(path, { token, ...options } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    })
    return { response, body: await response.json() }
  }

  it('完成配对、连接、监控、写入和断开', async () => {
    const health = await request('/v1/health')
    expect(health.response.status).toBe(200)

    const paired = await request('/v1/pair', { method: 'POST', body: JSON.stringify({ code: '123456' }) })
    expect(paired.response.status).toBe(200)
    const token = paired.body.token

    const connected = await request('/v1/connections', {
      token,
      method: 'POST',
      body: JSON.stringify({ series: 'S7-1200', ip: '192.168.0.1', rack: 0, slot: 1, timeoutMs: 5000 }),
    })
    expect(connected.response.status).toBe(201)
    const id = connected.body.connectionId

    const tags = [{ id: 'ready', name: 'Ready', area: 'M', byteOffset: 0, bitOffset: 0, dataType: 'BOOL', writable: true, address: 'M0.0' }]
    expect((await request(`/v1/connections/${id}/tags`, { token, method: 'PUT', body: JSON.stringify({ tags }) })).response.status).toBe(200)
    expect((await request(`/v1/connections/${id}/monitoring`, { token, method: 'POST', body: JSON.stringify({ intervalMs: 1000 }) })).response.status).toBe(200)
    expect((await request(`/v1/connections/${id}/snapshot`, { token })).body.tags[0]).toMatchObject({ id: 'ready', quality: 'good' })
    const lockedWrite = await request(`/v1/connections/${id}/write-preview`, { token, method: 'POST', body: JSON.stringify({ tagId: 'ready', value: true }) })
    expect(lockedWrite.response.status).toBe(423)
    expect((await request(`/v1/connections/${id}/write-unlock`, { token, method: 'POST', body: JSON.stringify({ confirmed: true }) })).body.writeUnlocked).toBe(true)
    const preview = await request(`/v1/connections/${id}/write-preview`, { token, method: 'POST', body: JSON.stringify({ tagId: 'ready', value: true }) })
    const commit = await request(`/v1/connections/${id}/write-commit`, { token, method: 'POST', body: JSON.stringify({ writeToken: preview.body.writeToken }) })
    expect(commit.body.verified).toBe(true)
    expect((await request(`/v1/connections/${id}`, { token, method: 'DELETE' })).body.disconnected).toBe(true)
  })

  it('拒绝未配对请求和公网 PLC 地址', async () => {
    expect((await request('/v1/connections', { method: 'POST', body: '{}' })).response.status).toBe(401)
    const paired = await request('/v1/pair', { method: 'POST', body: JSON.stringify({ code: '123456' }) })
    const result = await request('/v1/connections', {
      token: paired.body.token,
      method: 'POST',
      body: JSON.stringify({ series: 'S7-1500', ip: '8.8.8.8', rack: 0, slot: 1, timeoutMs: 5000 }),
    })
    expect(result.response.status).toBe(400)
    expect(result.body.error.fields).toHaveProperty('ip')
  })
})
