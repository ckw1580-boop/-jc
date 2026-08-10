import { describe, expect, it } from 'vitest'

import {
  clearSessionCookie,
  createSessionToken,
  hashSessionToken,
  hashPassword,
  normalizeUserId,
  readCookie,
  serializeSessionCookie,
  sessionExpiresAt,
  validateRegistration,
  verifyPassword,
} from './user-security.js'

describe('user input validation', () => {
  it('normalizes and validates registration input', () => {
    expect(normalizeUserId('  Engineer_01 ')).toBe('engineer_01')
    expect(validateRegistration({ userId: ' Engineer_01 ', email: ' USER@example.com ', password: '1234567890' })).toEqual({
      data: { userId: 'engineer_01', email: 'user@example.com', password: '1234567890' },
      errors: {},
    })
  })

  it('rejects invalid fields', () => {
    const result = validateRegistration({ userId: 'a b', email: 'bad', password: 'short' })
    expect(result.data).toBeUndefined()
    expect(result.errors).toMatchObject({ userId: expect.any(String), email: expect.any(String), password: expect.any(String) })
  })
})

describe('password storage', () => {
  it('uses a salted scrypt hash and verifies without storing plaintext', async () => {
    const first = await hashPassword('correct horse battery staple')
    const second = await hashPassword('correct horse battery staple')
    expect(first).toMatch(/^scrypt\$/)
    expect(first).not.toContain('correct horse battery staple')
    expect(first).not.toBe(second)
    await expect(verifyPassword('correct horse battery staple', first)).resolves.toBe(true)
    await expect(verifyPassword('wrong password', first)).resolves.toBe(false)
  })
})

describe('database-backed session token and cookie', () => {
  it('creates opaque tokens, stores only their hashes, and calculates expiry', () => {
    const now = Date.UTC(2026, 7, 10)
    const first = createSessionToken()
    const second = createSessionToken()
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first).not.toBe(second)
    expect(hashSessionToken(first)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashSessionToken(first)).not.toContain(first)
    expect(sessionExpiresAt(now)).toBe('2026-08-17T00:00:00.000Z')
  })

  it('serializes secure production cookies and parses request cookies', () => {
    const request = new Request('https://example.netlify.app/api/auth/session', { headers: { cookie: 'a=1; s7_user_session=abc.def' } })
    expect(readCookie(request)).toBe('abc.def')
    expect(serializeSessionCookie('abc.def', request)).toContain('HttpOnly; SameSite=Lax; Max-Age=604800; Secure')
    expect(clearSessionCookie(request)).toContain('Max-Age=0; Secure')
  })
})
