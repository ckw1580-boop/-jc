import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('./storage.js', () => ({ database: () => ({ pool: { query: mocks.query } }) }))

import loginHandler from '../auth-login.mjs'
import { hashPassword } from './user-security.js'

const context = { requestId: 'request-test' } as never
let passwordHash = ''

function loginRequest(userId = 'engineer_01', password = 'valid-password') {
  return new Request('https://s7.example/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://s7.example' },
    body: JSON.stringify({ userId, password }),
  })
}

beforeAll(async () => {
  process.env.USER_SESSION_SECRET = 'function-test-secret-with-more-than-thirty-two-bytes'
  passwordHash = await hashPassword('valid-password')
})

beforeEach(() => mocks.query.mockReset())

describe('auth login Function', () => {
  it('returns the same generic error for an unknown user and a wrong password', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] })
    const unknown = await loginHandler(loginRequest('unknown_01'), context)
    mocks.query.mockResolvedValueOnce({ rows: [{
      user_id: 'engineer_01', email: 'engineer@example.com', password_hash: passwordHash,
      account_status: 'active', session_version: 1, must_change_password: false,
    }] })
    const wrong = await loginHandler(loginRequest('engineer_01', 'wrong-password'), context)

    expect(unknown.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect((await unknown.json()).error).toEqual((await wrong.json()).error)
  })

  it('returns an explicit disabled message only after a valid password', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{
      user_id: 'engineer_01', email: 'engineer@example.com', password_hash: passwordHash,
      account_status: 'disabled', session_version: 4, must_change_password: false,
    }] })
    const response = await loginHandler(loginRequest(), context)
    expect(response.status).toBe(403)
    expect((await response.json()).error.code).toBe('account_disabled')
  })

  it('issues a seven-day HttpOnly cookie without returning the password hash', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{
      user_id: 'engineer_01', email: 'engineer@example.com', password_hash: passwordHash,
      account_status: 'active', session_version: 2, must_change_password: true,
    }] })
    const response = await loginHandler(loginRequest(), context)
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Lax; Max-Age=604800; Secure')
    expect(body).toEqual({
      user: { userId: 'engineer_01', email: 'engineer@example.com' },
      mustChangePassword: true,
    })
    expect(JSON.stringify(body)).not.toContain(passwordHash)
  })

  it('rejects cross-origin mutation requests before querying the database', async () => {
    const request = loginRequest()
    request.headers.set('Origin', 'https://evil.example')
    const response = await loginHandler(request, context)
    expect(response.status).toBe(403)
    expect(mocks.query).not.toHaveBeenCalled()
  })
})
