import type { FeedbackDraftInput, FeedbackUpdateInput } from './types.js'

export const MAX_FILES = 5
export const MAX_FILE_SIZE = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d\s()-]+$/

export function isUuid(value: string | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value))
}

export function validateDraft(value: unknown): {
  data?: FeedbackDraftInput
  errors?: Record<string, string>
} {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const data: FeedbackDraftInput = {
    contact: typeof source.contact === 'string' ? source.contact.trim() : '',
    phone: typeof source.phone === 'string' ? source.phone.trim() : '',
    email: typeof source.email === 'string' ? source.email.trim().toLowerCase() : '',
    description: typeof source.description === 'string' ? source.description.trim() : '',
  }
  const errors: Record<string, string> = {}
  const phoneDigits = data.phone.replace(/\D/g, '')

  if (data.contact.length < 2 || data.contact.length > 50) {
    errors.contact = '联系人请输入 2–50 个字符。'
  }
  if (!PHONE_PATTERN.test(data.phone) || phoneDigits.length < 6 || phoneDigits.length > 20) {
    errors.phone = '联系电话需包含 6–20 位数字，可使用空格、括号、加号或连字符。'
  }
  if (!EMAIL_PATTERN.test(data.email) || data.email.length > 254) {
    errors.email = '请输入有效的邮箱地址。'
  }
  if (data.description.length < 10 || data.description.length > 2000) {
    errors.description = '问题描述请输入 10–2000 个字符。'
  }

  return Object.keys(errors).length ? { errors } : { data }
}

export function validateFeedbackUpdate(value: unknown): {
  data?: FeedbackUpdateInput
  errors?: Record<string, string>
} {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const data: FeedbackUpdateInput = {
    title: typeof source.title === 'string' ? source.title.trim() : '',
    summary: typeof source.summary === 'string' ? source.summary.trim() : '',
  }
  const errors: Record<string, string> = {}

  if (data.title.length < 2 || data.title.length > 100) {
    errors.title = '公开标题请输入 2–100 个字符。'
  }
  if (data.summary.length < 10 || data.summary.length > 1000) {
    errors.summary = '解决说明请输入 10–1000 个字符。'
  }

  return Object.keys(errors).length ? { errors } : { data }
}

export function sanitizeFileName(value: string | null) {
  let decoded = value || 'attachment'
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    decoded = 'attachment'
  }
  const name = decoded.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim()
  return (name || 'attachment').slice(0, 180)
}

export function matchesImageSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === 'image/png') {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return png.every((byte, index) => bytes[index] === byte)
  }
  if (contentType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (contentType === 'image/webp') {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  }
  return false
}

