import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cleanup: vi.fn(), connect: vi.fn(), query: vi.fn(), release: vi.fn(), requireAdmin: vi.fn(),
}))
vi.mock('./auth.js', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('./blob-cleanup.js', () => ({ processBlobCleanup: mocks.cleanup }))
vi.mock('./storage.js', () => ({ database: () => ({ pool: { connect: mocks.connect } }) }))

import resolveFeedback from '../admin-feedback-resolve.mjs'

const feedbackId = '2df7d4a2-b0ea-4b29-86de-329be6645f8f'
const context = { params: { id: feedbackId }, requestId: 'resolve-test' } as never
function request(body: unknown, origin = 'https://s7.example') {
  return new Request(`https://s7.example/api/admin/feedback/${feedbackId}/resolve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mocks.cleanup.mockReset().mockResolvedValue({ deleted: 0, failed: 0 })
  mocks.query.mockReset()
  mocks.release.mockReset()
  mocks.connect.mockReset().mockResolvedValue({ query: mocks.query, release: mocks.release })
  mocks.requireAdmin.mockReset().mockResolvedValue({ user: { role: 'admin' } })
})

describe('resolve feedback Function', () => {
  it('rejects unauthenticated and cross-origin requests before database access', async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ response: new Response('{}', { status: 401 }) })
    const unauthenticated = await resolveFeedback(request({ title: '问题已解决', summary: '相关问题已经完成修正并通过验证。' }), context) as Response
    expect(unauthenticated.status).toBe(401)
    const crossOrigin = await resolveFeedback(request({ title: '问题已解决', summary: '相关问题已经完成修正并通过验证。' }, 'https://evil.example'), context) as Response
    expect(crossOrigin.status).toBe(403)
    expect(mocks.connect).not.toHaveBeenCalled()
  })

  it('validates public copy before starting a transaction', async () => {
    const response = await resolveFeedback(request({ title: 'A', summary: '太短' }), context) as Response
    expect(response.status).toBe(422)
    expect((await response.json()).error.fields).toEqual({ title: '公开标题请输入 2–100 个字符。', summary: '解决说明请输入 10–1000 个字符。' })
    expect(mocks.connect).not.toHaveBeenCalled()
  })

  it('creates only public copy, deletes the feedback, and returns no private fields', async () => {
    const update = {
      id: 'f661fc3f-f366-4d6b-8021-760955e8ea16', source_feedback_id: feedbackId,
      title: '连接状态问题已解决', summary: '已修正连接状态同步逻辑，刷新页面后即可生效。',
      published_at: '2026-08-10T14:00:00.000Z', updated_at: '2026-08-10T14:00:00.000Z',
    }
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM shujufankui')) return { rows: [{
        id: feedbackId, contact_name: '王工', contact_phone: '13800000000', email: 'private@example.com',
        description: 'private description', image_attachments: [], submission_state: 'submitted',
      }] }
      if (sql.includes('INSERT INTO feedback_updates')) return { rows: [update] }
      return { rows: [] }
    })
    const response = await resolveFeedback(request({ title: update.title, summary: update.summary }), context) as Response
    const body = await response.json()
    expect(response.status).toBe(201)
    expect(body.update).toEqual(update)
    expect(JSON.stringify(body)).not.toContain('private@example.com')
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM shujufankui'))).toBe(true)
    expect(mocks.query.mock.calls.map(([sql]) => sql)).toContain('COMMIT')
    expect(mocks.release).toHaveBeenCalledOnce()
  })

  it('returns 404 when the feedback was already resolved', async () => {
    mocks.query.mockImplementation(async (sql: string) => sql.includes('SELECT * FROM shujufankui') ? { rows: [] } : { rows: [] })
    const response = await resolveFeedback(request({ title: '问题已解决', summary: '相关问题已经完成修正并通过验证。' }), context) as Response
    expect(response.status).toBe(404)
    expect(mocks.query.mock.calls.map(([sql]) => sql)).toContain('ROLLBACK')
  })
})
