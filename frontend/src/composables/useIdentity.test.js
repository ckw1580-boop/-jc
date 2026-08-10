import { describe, expect, it } from 'vitest'

import { hasAdminRole } from './useIdentity.js'

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
    expect(hasAdminRole({ appMetadata: { roles: ['viewer'] } })).toBe(false)
  })
})
