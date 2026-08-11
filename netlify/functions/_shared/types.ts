export interface FeedbackAttachment {
  id: string
  blobKey: string
  name: string
  contentType: string
  size: number
  uploadedAt: string
}

export interface FeedbackRow {
  id: string
  contact_name: string
  contact_phone: string
  email: string
  description: string
  image_attachments: FeedbackAttachment[]
  submission_state: 'draft' | 'submitted'
  upload_token_hash: string | null
  created_at: Date | string
  submitted_at: Date | string | null
}

export interface FeedbackDraftInput {
  contact: string
  phone: string
  email: string
  description: string
}

export interface FeedbackUpdateInput {
  title: string
  summary: string
}

export interface FeedbackUpdateRow {
  id: string
  source_feedback_id: string
  title: string
  summary: string
  published_at: Date | string
  updated_at: Date | string
}

export interface BlobCleanupRow {
  blob_key: string
  source_feedback_id: string
  attempts: number
}

