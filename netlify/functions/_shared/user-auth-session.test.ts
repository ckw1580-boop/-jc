import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('./storage.js', () => ({ database: () => ({ pool: { query: mocks.query } }) }))

import { getSiteUser } from './user-auth.js'
import { hashSessionToken } from './user-security.js'

beforeEach(() => mocks.query.mockReset())

describe('database-backed site user session', () => {
  it('returns null without querying when the session cookie is missing', async () => {
    const user = await getSiteUser(new Request('https://s7.example/api/auth/session'))
    expect(user).toBeNull()
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('looks up only the token hash and returns an active user', async () => {
    const token = 'opaque-session-token'
    mocks.query.mockResolvedValueOnce({ rows: [{
      user_id: 'engineer_01',
      email: 'engineer@example.com',
      account_status: 'active',
      session_version: 3,
      must_change_password: false,
    }] })

    const user = await getSiteUser(new Request('https://s7.example/api/auth/session', {
      headers: { cookie: `s7_user_session=${token}` },
    }))

    expect(user).toMatchObject({ userId: 'engineer_01', email: 'engineer@example.com' })
    expect(mocks.query.mock.calls[0]?.[1]).toEqual([hashSessionToken(token)])
    expect(mocks.query.mock.calls[0]?.[1]).not.toContain(token)
  })

  it('rejects a disabled account even when a session row is returned', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{
      user_id: 'engineer_01',
      email: 'engineer@example.com',
      account_status: 'disabled',
      session_version: 4,
      must_change_password: false,
    }] })

    const user = await getSiteUser(new Request('https://s7.example/api/auth/session', {
      headers: { cookie: 's7_user_session=opaque-session-token' },
    }))
    expect(user).toBeNull()
  })
})
