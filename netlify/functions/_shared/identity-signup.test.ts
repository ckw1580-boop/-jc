import { afterEach, describe, expect, it } from 'vitest'

import { handler } from '../identity-signup.mjs'

afterEach(() => {
  delete process.env.ADMIN_EMAIL
  delete process.env.ADMIN_DISPLAY_NAME
})

describe('identity-signup', () => {
  it('assigns the admin role to the configured email', async () => {
    process.env.ADMIN_EMAIL = ' 1873408329@QQ.COM '
    process.env.ADMIN_DISPLAY_NAME = 'S7 Admin'

    const response = await (handler as any)({
      body: JSON.stringify({
        user: {
          email: '1873408329@qq.com',
          app_metadata: { provider: 'email' },
          user_metadata: {},
        },
      }),
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({
      app_metadata: {
        provider: 'email',
        roles: ['admin'],
      },
      user_metadata: {
        full_name: 'S7 Admin',
      },
    })
  })

  it('does not assign the admin role to another email', async () => {
    process.env.ADMIN_EMAIL = '1873408329@qq.com'

    const response = await (handler as any)({
      body: JSON.stringify({
        user: {
          email: 'other@example.com',
          app_metadata: {},
          user_metadata: {},
        },
      }),
    })

    expect(JSON.parse(response.body).app_metadata.roles).toEqual([])
  })
})
