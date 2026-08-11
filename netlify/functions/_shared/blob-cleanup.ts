import type { Context } from '@netlify/functions'

import { database, imageStore } from './storage.js'
import type { BlobCleanupRow } from './types.js'

export async function processBlobCleanup(
  context: Context,
  items: Array<Pick<BlobCleanupRow, 'blob_key' | 'source_feedback_id'>>,
) {
  if (!items.length) return { deleted: 0, failed: 0 }

  const db = database()
  const store = imageStore(context)
  let deleted = 0
  let failed = 0

  for (const item of items) {
    try {
      await store.delete(item.blob_key)
      await db.pool.query('DELETE FROM feedback_blob_cleanup_queue WHERE blob_key = $1', [item.blob_key])
      deleted += 1
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[${context.requestId}] Blob cleanup failed for feedback ${item.source_feedback_id}`, error)
      await db.pool.query(
        `UPDATE feedback_blob_cleanup_queue
            SET attempts = attempts + 1,
                last_error = $2,
                next_attempt_at = NOW() + INTERVAL '1 hour'
          WHERE blob_key = $1`,
        [item.blob_key, message.slice(0, 1000)],
      ).catch((queueError: unknown) => {
        console.error(`[${context.requestId}] Failed to update Blob cleanup retry state`, queueError)
      })
    }
  }

  return { deleted, failed }
}
