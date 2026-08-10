import { describe, expect, it } from 'vitest'

import { hasAdminRole } from './auth.js'

describe('hasAdminRole', () => {
  it.each([
    { role: 'admin' },
    { roles: ['admin'] },
    { appMetadata: { roles: ['admin'] } },
    { app_metadata: { roles: ['admin'] } },
  ])('accepts supported Identity role shapes', (user) => {
    expect(hasAdminRole(user)).toBe(true)
  })

  it('rejects users without the admin role', () => {
    expect(hasAdminRole({ app_metadata: { roles: ['viewer'] } })).toBe(false)
  })
})
