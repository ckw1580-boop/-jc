import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ deleteBlob: vi.fn(), query: vi.fn() }))
vi.mock('./storage.js', () => ({
  database: () => ({ pool: { query: mocks.query } }),
  imageStore: () => ({ delete: mocks.deleteBlob }),
}))

import { processBlobCleanup } from './blob-cleanup.js'

const context = { requestId: 'cleanup-test' } as never
const item = { blob_key: 'feedback/example/image.png', source_feedback_id: '2df7d4a2-b0ea-4b29-86de-329be6645f8f' }

beforeEach(() => {
  mocks.deleteBlob.mockReset()
  mocks.query.mockReset().mockResolvedValue({ rows: [] })
})

describe('feedback Blob cleanup', () => {
  it('removes the retry record after deleting a Blob', async () => {
    mocks.deleteBlob.mockResolvedValueOnce(undefined)
    await expect(processBlobCleanup(context, [item])).resolves.toEqual({ deleted: 1, failed: 0 })
    expect(mocks.query.mock.calls[0]?.[0]).toContain('DELETE FROM feedback_blob_cleanup_queue')
  })

  it('keeps the record and schedules a retry when Blob deletion fails', async () => {
    mocks.deleteBlob.mockRejectedValueOnce(new Error('temporary Blob failure'))
    await expect(processBlobCleanup(context, [item])).resolves.toEqual({ deleted: 0, failed: 1 })
    expect(mocks.query.mock.calls[0]?.[0]).toContain('UPDATE feedback_blob_cleanup_queue')
    expect(mocks.query.mock.calls[0]?.[1]).toEqual([item.blob_key, 'temporary Blob failure'])
  })
})
