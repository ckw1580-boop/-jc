import { describe, expect, it } from 'vitest'

import { originAllowed, PairingManager } from './security.js'

describe('本地配对安全', () => {
  it('只接受生产、预览和本地开发来源', () => {
    expect(originAllowed('https://s7-control-wck-tlss.netlify.app')).toBe(true)
    expect(originAllowed('https://deploy-preview-18--s7-control-wck-tlss.netlify.app')).toBe(true)
    expect(originAllowed('https://example.com')).toBe(false)
  })

  it('令牌绑定来源并在八小时后失效', () => {
    let now = 1000
    const pairing = new PairingManager({ now: () => now, codeFactory: () => '123456' })
    const session = pairing.pair('123456', 'http://localhost:5173')
    expect(pairing.authenticate(session.token, 'http://localhost:5173')).toBeTruthy()
    expect(() => pairing.authenticate(session.token, 'https://s7-control-wck-tlss.netlify.app')).toThrow()
    now += 8 * 60 * 60 * 1000 + 1
    expect(() => pairing.authenticate(session.token, 'http://localhost:5173')).toThrow()
  })

  it('限制一分钟内的失败配对次数', () => {
    const pairing = new PairingManager({ codeFactory: () => '123456' })
    for (let index = 0; index < 5; index += 1) expect(() => pairing.pair('000000', 'http://localhost:5173')).toThrow()
    expect(() => pairing.pair('123456', 'http://localhost:5173')).toThrow(/过多/)
  })
})
