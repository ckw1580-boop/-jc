import { isIP } from 'node:net'

const TYPES = new Set(['BOOL', 'BYTE', 'INT', 'REAL', 'TIME'])
const AREAS = new Set(['DB', 'I', 'Q', 'M'])

export function isPrivateIpv4(value) {
  if (isIP(value) !== 4) return false
  const octets = value.split('.').map(Number)
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
}

export function validateConnectionProfile(profile) {
  const fields = {}
  if (!['S7-1200', 'S7-1500'].includes(profile?.series)) fields.series = '只支持 S7-1200 或 S7-1500。'
  if (!isPrivateIpv4(profile?.ip)) fields.ip = '只允许 RFC1918 局域网 IPv4 地址。'
  if (!Number.isInteger(profile?.rack) || profile.rack < 0 || profile.rack > 7) fields.rack = '机架必须为 0–7。'
  if (!Number.isInteger(profile?.slot) || profile.slot < 0 || profile.slot > 31) fields.slot = '插槽必须为 0–31。'
  if (!Number.isInteger(profile?.timeoutMs) || profile.timeoutMs < 1000 || profile.timeoutMs > 15000) fields.timeoutMs = '超时必须为 1000–15000 毫秒。'
  return fields
}

export function validateTag(tag) {
  const fields = {}
  if (!tag || typeof tag !== 'object') return { tag: '变量格式无效。' }
  const name = String(tag.name || '').trim()
  if (!name || name.length > 64 || /[\u0000-\u001f\u007f]/.test(name)) fields.name = '变量名称必须为 1–64 个可见字符。'
  if (!AREAS.has(tag.area)) fields.area = '区域必须为 DB、I、Q 或 M。'
  if (!TYPES.has(tag.dataType)) fields.dataType = '不支持该数据类型。'
  if (tag.area === 'DB' && (!Number.isInteger(tag.dbNumber) || tag.dbNumber < 1 || tag.dbNumber > 65535)) fields.dbNumber = 'DB 编号必须为 1–65535。'
  if (!Number.isInteger(tag.byteOffset) || tag.byteOffset < 0 || tag.byteOffset > 16777215) fields.byteOffset = '字节偏移无效。'
  if (tag.dataType === 'BOOL' && (!Number.isInteger(tag.bitOffset) || tag.bitOffset < 0 || tag.bitOffset > 7)) fields.bitOffset = 'BOOL 位偏移必须为 0–7。'
  if (tag.dataType !== 'BOOL' && tag.bitOffset !== undefined && tag.bitOffset !== null) fields.bitOffset = '非 BOOL 变量不能包含位偏移。'
  return fields
}

export function normalizedAddress(tag) {
  const typeWidth = tag.dataType === 'BYTE' ? 'B' : tag.dataType === 'INT' ? 'W' : 'D'
  if (tag.area === 'DB') {
    if (tag.dataType === 'BOOL') return `DB${tag.dbNumber}.DBX${tag.byteOffset}.${tag.bitOffset}`
    return `DB${tag.dbNumber}.DB${typeWidth}${tag.byteOffset}`
  }
  if (tag.dataType === 'BOOL') return `${tag.area}${tag.byteOffset}.${tag.bitOffset}`
  return `${tag.area}${typeWidth}${tag.byteOffset}`
}

export function toNodes7Address(tag) {
  if (tag.area === 'DB') {
    const type = tag.dataType === 'BOOL' ? `X${tag.byteOffset}.${tag.bitOffset}`
      : tag.dataType === 'BYTE' ? `BYTE${tag.byteOffset}`
        : tag.dataType === 'INT' ? `INT${tag.byteOffset}`
          : tag.dataType === 'REAL' ? `REAL${tag.byteOffset}`
            : `DINT${tag.byteOffset}`
    return `DB${tag.dbNumber},${type}`
  }
  if (tag.dataType === 'BOOL') return `${tag.area}${tag.byteOffset}.${tag.bitOffset}`
  const type = tag.dataType === 'BYTE' ? 'B' : tag.dataType === 'INT' ? 'W' : tag.dataType === 'REAL' ? 'R' : 'D'
  return `${tag.area}${type}${tag.byteOffset}`
}

export function validateTagCollection(tags) {
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > 500) return { tags: '变量数量必须为 1–500。' }
  const fields = {}
  const seenIds = new Set()
  const seenAddresses = new Set()
  tags.forEach((tag, index) => {
    const tagFields = validateTag(tag)
    if (Object.keys(tagFields).length) fields[index] = tagFields
    if (!tag.id || seenIds.has(tag.id)) fields[index] = { ...(fields[index] || {}), id: '变量 ID 缺失或重复。' }
    seenIds.add(tag.id)
    if (!Object.keys(tagFields).length) {
      const address = normalizedAddress(tag)
      if (seenAddresses.has(address)) fields[index] = { ...(fields[index] || {}), address: '绝对地址重复。' }
      seenAddresses.add(address)
    }
  })
  return fields
}

export function normalizeWriteValue(type, input) {
  if (type === 'BOOL') {
    if (typeof input !== 'boolean') throw new Error('BOOL 写入值必须为布尔值。')
    return input
  }
  const value = Number(input)
  if (!Number.isFinite(value)) throw new Error('写入值必须为有效数字。')
  if (type === 'BYTE' && (!Number.isInteger(value) || value < 0 || value > 255)) throw new Error('BYTE 必须为 0–255。')
  if (type === 'INT' && (!Number.isInteger(value) || value < -32768 || value > 32767)) throw new Error('INT 必须为 -32768–32767。')
  if (type === 'TIME' && (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)) throw new Error('TIME 超出 32 位毫秒范围。')
  return value
}

export function equalPlcValue(left, right, dataType) {
  if (dataType === 'REAL') return Math.abs(Number(left) - Number(right)) <= Math.max(1e-5, Math.abs(Number(right)) * 1e-6)
  return Object.is(left, right)
}
