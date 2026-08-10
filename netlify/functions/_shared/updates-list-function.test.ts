import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn(), requireSiteUser: vi.fn() }))
vi.mock('./storage.js', () => ({ database: () => ({ pool: { query: mocks.query } }) }))
vi.mock('./user-auth.js', () => ({ requireSiteUser: mocks.requireSiteUser }))

import listUpdates from '../updates-list.mjs'

const context = { requestId: 'updates-test' } as never
const request = new Request('https://s7.example/api/updates?page=1&pageSize=20')

beforeEach(() => {
  mocks.query.mockReset()
  mocks.requireSiteUser.mockReset().mockResolvedValue({ user: { userId: 'operator' } })
})

describe('public updates Function', () => {
  it('requires a normal user session', async () => {
    mocks.requireSiteUser.mockResolvedValueOnce({ response: new Response('{}', { status: 401 }) })
    const response = await listUpdates(request, context) as Response
    expect(response.status).toBe(401)
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('returns only public update fields', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [{
      id: 'f661fc3f-f366-4d6b-8021-760955e8ea16', title: '问题已解决',
      summary: '相关问题已经完成修正并通过验证。',
      published_at: '2026-08-10T14:00:00.000Z', updated_at: '2026-08-10T14:00:00.000Z',
    }] })
    const response = await listUpdates(request, context) as Response
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.total).toBe(1)
    expect(Object.keys(body.items[0])).toEqual(['id', 'title', 'summary', 'published_at', 'updated_at'])
    expect(JSON.stringify(body)).not.toMatch(/contact|phone|email|attachment|description/)
  })
})
