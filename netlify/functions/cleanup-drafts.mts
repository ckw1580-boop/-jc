import type { Config, Context } from '@netlify/functions'

import { processBlobCleanup } from './_shared/blob-cleanup.js'
import { database, imageStore } from './_shared/storage.js'
import type { BlobCleanupRow, FeedbackRow } from './_shared/types.js'

export default async (_request: Request, context: Context) => {
  const db = database()
  const expiredSessions = await db.pool.query('DELETE FROM user_sessions WHERE expires_at <= NOW()')
  const cleanupResult = await db.pool.query<BlobCleanupRow>(
    `SELECT blob_key, source_feedback_id, attempts
       FROM feedback_blob_cleanup_queue
      WHERE next_attempt_at <= NOW()
      ORDER BY next_attempt_at, created_at
      LIMIT 50`,
  )
  const blobCleanup = await processBlobCleanup(context, cleanupResult.rows)
  const result = await db.pool.query<Pick<FeedbackRow, 'id' | 'image_attachments'>>(
    `SELECT id, image_attachments
     FROM shujufankui
     WHERE submission_state = 'draft'
       AND created_at < NOW() - INTERVAL '24 hours'
     ORDER BY created_at
     LIMIT 50`,
  )

  let deleted = 0
  for (const feedback of result.rows) {
    for (const attachment of feedback.image_attachments) {
      await imageStore(context).delete(attachment.blobKey)
    }
    await db.pool.query(
      `DELETE FROM shujufankui
       WHERE id = $1 AND submission_state = 'draft'`,
      [feedback.id],
    )
    deleted += 1
  }

  console.log(`[${context.requestId}] Deleted ${expiredSessions.rowCount || 0} expired user sessions, ${deleted} stale feedback drafts, and ${blobCleanup.deleted} queued feedback Blobs; ${blobCleanup.failed} Blob deletions will retry`)
}

export const config: Config = {
  schedule: '0 * * * *',
}
