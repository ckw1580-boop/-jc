import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const SESSION_TTL = 8 * 60 * 60 * 1000
const PAIR_CODE_TTL = 5 * 60 * 1000

export function originAllowed(origin) {
  if (!origin) return false
  if (['https://s7-control-wck-tlss.netlify.app', 'http://localhost:5173', 'http://localhost:8888'].includes(origin)) return true
  return /^https:\/\/deploy-preview-\d+--s7-control-wck-tlss\.netlify\.app$/.test(origin)
}

export class PairingManager {
  constructor({ now = () => Date.now(), codeFactory = () => String(randomInt(0, 1000000)).padStart(6, '0') } = {}) {
    this.now = now
    this.codeFactory = codeFactory
    this.sessions = new Map()
    this.attempts = new Map()
    this.rotateCode()
  }

  rotateCode() {
    this.code = this.codeFactory()
    this.codeExpiresAt = this.now() + PAIR_CODE_TTL
  }

  currentCode() {
    if (this.now() >= this.codeExpiresAt) this.rotateCode()
    return { code: this.code, expiresAt: new Date(this.codeExpiresAt).toISOString() }
  }

  pair(code, origin) {
    if (!originAllowed(origin)) throw Object.assign(new Error('网页来源不在本地网关允许列表中。'), { code: 'REAL-GW-003', status: 403 })
    const recent = (this.attempts.get(origin) || []).filter((time) => this.now() - time < 60000)
    if (recent.length >= 5) throw Object.assign(new Error('配对尝试过多，请一分钟后重试。'), { code: 'REAL-GW-004', status: 429 })
    recent.push(this.now())
    this.attempts.set(origin, recent)
    const expected = Buffer.from(this.currentCode().code)
    const provided = Buffer.from(String(code || ''))
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw Object.assign(new Error('配对码不正确或已过期。'), { code: 'REAL-GW-002', status: 401 })
    const token = randomBytes(32).toString('base64url')
    const expiresAt = this.now() + SESSION_TTL
    this.sessions.set(token, { origin, expiresAt })
    this.rotateCode()
    return { token, expiresAt: new Date(expiresAt).toISOString() }
  }

  authenticate(token, origin) {
    const session = this.sessions.get(token)
    if (!session || session.origin !== origin || this.now() >= session.expiresAt) {
      if (session) this.sessions.delete(token)
      throw Object.assign(new Error('本地网关配对已失效。'), { code: 'REAL-GW-002', status: 401 })
    }
    return session
  }
}
