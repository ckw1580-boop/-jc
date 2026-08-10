import type { Config, Context } from '@netlify/functions'

import { database, imageStore } from './_shared/storage.js'
import type { FeedbackRow } from './_shared/types.js'

export default async (_request: Request, context: Context) => {
  const db = database()
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

  console.log(`[${context.requestId}] Deleted ${deleted} stale feedback drafts`)
}

export const config: Config = {
  schedule: '0 * * * *',
}
