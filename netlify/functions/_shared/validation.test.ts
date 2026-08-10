import { describe, expect, it } from 'vitest'

import {
  matchesImageSignature,
  sanitizeFileName,
  validateDraft,
} from './validation.js'

describe('validateDraft', () => {
  it('normalizes and accepts valid feedback', () => {
    const result = validateDraft({
      contact: '  王工  ',
      phone: '+86 138-0000-0000',
      email: ' USER@EXAMPLE.COM ',
      description: 'S7-1200 无法建立模拟连接。',
    })

    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      contact: '王工',
      phone: '+86 138-0000-0000',
      email: 'user@example.com',
      description: 'S7-1200 无法建立模拟连接。',
    })
  })

  it('returns field errors for invalid input', () => {
    const result = validateDraft({
      contact: 'A',
      phone: '123',
      email: 'invalid',
      description: '太短',
    })

    expect(Object.keys(result.errors || {})).toEqual([
      'contact',
      'phone',
      'email',
      'description',
    ])
  })
})

describe('image validation', () => {
  it('checks signatures instead of trusting MIME alone', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(matchesImageSignature(png, 'image/png')).toBe(true)
    expect(matchesImageSignature(new Uint8Array([1, 2, 3]), 'image/png')).toBe(false)
  })

  it('sanitizes unsafe attachment names', () => {
    expect(sanitizeFileName(encodeURIComponent('../status?.png'))).toBe('.._status_.png')
  })
})
