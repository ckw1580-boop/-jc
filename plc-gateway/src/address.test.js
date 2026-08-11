import { describe, expect, it } from 'vitest'

import { equalPlcValue, isPrivateIpv4, normalizeWriteValue, normalizedAddress, toNodes7Address, validateConnectionProfile, validateTagCollection } from './address.js'

describe('网关地址与类型校验', () => {
  it('只允许 RFC1918 IPv4', () => {
    expect(isPrivateIpv4('192.168.0.1')).toBe(true)
    expect(isPrivateIpv4('172.31.2.4')).toBe(true)
    expect(isPrivateIpv4('8.8.8.8')).toBe(false)
    expect(validateConnectionProfile({ series: 'S7-1200', ip: '8.8.8.8', rack: 0, slot: 1, timeoutMs: 5000 })).toHaveProperty('ip')
  })

  it('将五种类型映射为 nodes7 地址', () => {
    expect(toNodes7Address({ area: 'DB', dbNumber: 1, byteOffset: 0, bitOffset: 1, dataType: 'BOOL' })).toBe('DB1,X0.1')
    expect(toNodes7Address({ area: 'DB', dbNumber: 1, byteOffset: 2, dataType: 'INT' })).toBe('DB1,INT2')
    expect(toNodes7Address({ area: 'DB', dbNumber: 1, byteOffset: 4, dataType: 'REAL' })).toBe('DB1,REAL4')
    expect(toNodes7Address({ area: 'DB', dbNumber: 1, byteOffset: 8, dataType: 'TIME' })).toBe('DB1,DINT8')
    expect(normalizedAddress({ area: 'Q', byteOffset: 10, dataType: 'BYTE' })).toBe('QB10')
  })

  it('检查范围、重复地址和 REAL 回读容差', () => {
    expect(() => normalizeWriteValue('BYTE', 256)).toThrow()
    expect(normalizeWriteValue('TIME', 2000)).toBe(2000)
    expect(equalPlcValue(1.0000001, 1, 'REAL')).toBe(true)
    const base = { name: 'Tag', area: 'M', byteOffset: 2, dataType: 'INT', writable: true }
    expect(validateTagCollection([{ ...base, id: 'a' }, { ...base, id: 'b' }])).toHaveProperty('1.address')
  })
})
