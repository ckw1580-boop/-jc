import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'

import { equalPlcValue, normalizeWriteValue, toNodes7Address } from './address.js'

const require = createRequire(import.meta.url)
const nodes7 = require('nodes7')

function callbackPromise(executor, errorFactory) {
  return new Promise((resolve, reject) => executor((error, value) => error ? reject(errorFactory(error)) : resolve(value)))
}

function connectionError(error) {
  const message = error instanceof Error ? error.message : String(error || 'S7 connection failed')
  const network = /timeout|timed out|econn|unreach|refused|socket/i.test(message)
  const access = /access|permission|put|get|optimized|function.*(?:refused|available)/i.test(message)
  const code = network ? 'REAL-NET-001' : access ? 'REAL-S7-002' : 'REAL-S7-001'
  const description = network ? '无法连接 PLC 的 TCP 102 端口。' : access ? 'PLC 拒绝 S7 访问，请检查 PUT/GET 权限和 DB 访问模式。' : 'S7 会话建立失败，请核对机架、插槽与 PUT/GET 设置。'
  return Object.assign(new Error(description), { code, cause: error })
}

export class NodeS7Adapter {
  constructor({ logger = () => undefined } = {}) {
    this.logger = logger
    this.client = null
    this.tags = new Map()
    this.monitoring = false
    this.writeTokens = new Map()
  }

  async connect(profile) {
    this.client = new nodes7()
    this.client.setTranslationCB((id) => {
      const tag = this.tags.get(id)
      return tag ? toNodes7Address(tag) : id
    })
    await callbackPromise(
      (done) => this.client.initiateConnection({ host: profile.ip, port: 102, rack: profile.rack, slot: profile.slot, timeout: profile.timeoutMs }, done),
      connectionError,
    )
    this.profile = profile
  }

  configureTags(tags) {
    this.client.removeItems()
    this.tags = new Map(tags.map((tag) => [tag.id, { ...tag }]))
    this.client.addItems([...this.tags.keys()])
  }

  async readSnapshot() {
    if (!this.monitoring) throw Object.assign(new Error('变量监控尚未启动。'), { code: 'REAL-ADDR-001', status: 409 })
    const startedAt = Date.now()
    const values = await new Promise((resolve, reject) => {
      this.client.readAllItems((badQuality, result) => {
        if (!result || typeof result !== 'object') reject(Object.assign(new Error('PLC 未返回变量数据。'), { code: 'REAL-ADDR-001' }))
        else resolve({ badQuality, result })
      })
    })
    const timestamp = new Date().toISOString()
    const tags = [...this.tags.values()].map((tag) => {
      const value = values.result[tag.id]
      const bad = value === undefined || (typeof value === 'string' && /^BAD\b/i.test(value))
      return { id: tag.id, value: bad ? null : value, quality: bad ? 'bad' : 'good', timestamp, ...(bad ? { error: value } : {}) }
    })
    return { tags, quality: tags.every((tag) => tag.quality === 'good') ? '良好' : '部分故障', timestamp, cycleTimeMs: Date.now() - startedAt }
  }

  async readTag(tagId) {
    const previous = this.monitoring
    this.monitoring = true
    try {
      const snapshot = await this.readSnapshot()
      const tag = snapshot.tags.find((entry) => entry.id === tagId)
      if (!tag || tag.quality !== 'good') throw Object.assign(new Error(tag?.error || '变量读取失败。'), { code: 'REAL-ADDR-001' })
      return tag.value
    } finally {
      this.monitoring = previous
    }
  }

  async previewWrite(tagId, input) {
    const tag = this.tags.get(tagId)
    if (!tag) throw Object.assign(new Error('变量不存在。'), { code: 'REAL-ADDR-001', status: 404 })
    if (!tag.writable) throw Object.assign(new Error('该变量被配置为只读。'), { code: 'REAL-WRITE-001', status: 403 })
    const newValue = normalizeWriteValue(tag.dataType, input)
    const oldValue = await this.readTag(tagId)
    const writeToken = randomUUID()
    const expiresAt = Date.now() + 30000
    this.writeTokens.set(writeToken, { tagId, oldValue, newValue, expiresAt })
    return { writeToken, oldValue, newValue, expiresAt: new Date(expiresAt).toISOString() }
  }

  async commitWrite(writeToken) {
    const preview = this.writeTokens.get(writeToken)
    this.writeTokens.delete(writeToken)
    if (!preview || Date.now() >= preview.expiresAt) throw Object.assign(new Error('写入确认已过期，请重新确认。'), { code: 'REAL-WRITE-001', status: 409 })
    const tag = this.tags.get(preview.tagId)
    const currentValue = await this.readTag(preview.tagId)
    if (!equalPlcValue(currentValue, preview.oldValue, tag.dataType)) throw Object.assign(new Error('PLC 值在确认期间已经变化，请重新确认写入。'), { code: 'REAL-WRITE-001', status: 409 })
    await new Promise((resolve, reject) => {
      const busy = this.client.writeItems(preview.tagId, preview.newValue, (badQuality) => badQuality ? reject(Object.assign(new Error('PLC 拒绝写入。'), { code: 'REAL-WRITE-001' })) : resolve())
      if (busy) reject(Object.assign(new Error('网关当前有其他写入操作。'), { code: 'REAL-WRITE-001', status: 409 }))
    })
    const readBack = await this.readTag(preview.tagId)
    if (!equalPlcValue(readBack, preview.newValue, tag.dataType)) throw Object.assign(new Error('写入后的回读值不一致。'), { code: 'REAL-WRITE-001' })
    this.logger('write', { address: tag.address, oldValue: preview.oldValue, newValue: preview.newValue, result: 'verified' })
    return { tagId: preview.tagId, value: readBack, verified: true }
  }

  async disconnect() {
    this.monitoring = false
    this.writeTokens.clear()
    if (!this.client) return
    await new Promise((resolve) => {
      try { this.client.dropConnection(() => resolve()) } catch { resolve() }
      setTimeout(resolve, 500)
    })
    this.client = null
  }
}
