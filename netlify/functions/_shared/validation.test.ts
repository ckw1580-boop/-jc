import { describe, expect, it } from 'vitest'

import {
  matchesImageSignature,
  sanitizeFileName,
  validateDraft,
  validateFeedbackUpdate,
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

describe('validateFeedbackUpdate', () => {
  it('trims and accepts safe public update copy', () => {
    expect(validateFeedbackUpdate({
      title: '  S7-1200 连接超时问题已解决  ',
      summary: '  已修正演示场景中的连接状态同步逻辑，刷新页面后即可生效。  ',
    })).toEqual({
      data: {
        title: 'S7-1200 连接超时问题已解决',
        summary: '已修正演示场景中的连接状态同步逻辑，刷新页面后即可生效。',
      },
    })
  })

  it('rejects missing, short, and oversized public copy', () => {
    const result = validateFeedbackUpdate({ title: 'A', summary: '太短' })
    expect(result.errors).toEqual({
      title: '公开标题请输入 2–100 个字符。',
      summary: '解决说明请输入 10–1000 个字符。',
    })
  })

  it('does not copy unrelated feedback fields', () => {
    const result = validateFeedbackUpdate({
      title: '问题处理完成',
      summary: '相关功能已完成修正并通过验证，可以正常使用。',
      email: 'private@example.com',
      contact_name: '王工',
    })
    expect(result.data).toEqual({
      title: '问题处理完成',
      summary: '相关功能已完成修正并通过验证，可以正常使用。',
    })
  })
})
