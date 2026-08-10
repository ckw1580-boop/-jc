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

