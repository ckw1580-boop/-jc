const AREAS = new Set(['DB', 'I', 'Q', 'M'])
const DATA_TYPES = new Set(['BOOL', 'BYTE', 'INT', 'REAL', 'TIME'])

const HEADER_ALIASES = {
  name: ['name', 'tag', 'tagname', 'symbol', '变量名称', '变量名', '名称'],
  address: ['address', 'logicaladdress', 'plcaddress', '地址', '逻辑地址'],
  dataType: ['datatype', 'type', '数据类型', '类型'],
  comment: ['comment', 'description', '注释', '说明', '描述'],
}

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_\-./]/g, '')
}

function parseDelimited(text, delimiter) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some((entry) => entry.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  row.push(cell)
  if (row.some((entry) => entry.trim())) rows.push(row)
  return rows
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const candidates = [',', ';', '\t']
  return candidates.sort((left, right) => firstLine.split(right).length - firstLine.split(left).length)[0]
}

function findColumn(headers, key) {
  const aliases = HEADER_ALIASES[key]
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)))
}

function normalizeDataType(value) {
  const normalized = String(value || '').trim().toUpperCase()
  const aliases = { BIT: 'BOOL', BOOLEAN: 'BOOL', USINT: 'BYTE', SINT: 'BYTE', INTEGER: 'INT', FLOAT: 'REAL' }
  return aliases[normalized] || normalized
}

export function createEmptyTag() {
  return {
    id: crypto.randomUUID(),
    name: '',
    area: 'DB',
    dbNumber: 1,
    byteOffset: 0,
    bitOffset: 0,
    dataType: 'BOOL',
    writable: false,
    unit: '',
    comment: '',
  }
}

export function formatTagAddress(tag) {
  const area = String(tag.area || '').toUpperCase()
  const type = String(tag.dataType || '').toUpperCase()
  const byteOffset = Number(tag.byteOffset)
  const bitOffset = Number(tag.bitOffset)
  const width = type === 'BYTE' ? 'B' : type === 'INT' ? 'W' : 'D'

  if (area === 'DB') {
    if (type === 'BOOL') return `DB${Number(tag.dbNumber)}.DBX${byteOffset}.${bitOffset}`
    return `DB${Number(tag.dbNumber)}.DB${width}${byteOffset}`
  }
  if (type === 'BOOL') return `${area}${byteOffset}.${bitOffset}`
  return `${area}${width}${byteOffset}`
}

export function parsePlcAddress(address, dataTypeHint = '') {
  const source = String(address || '').trim().toUpperCase().replace(/^%/, '').replace(/\s+/g, '')
  let match = source.match(/^DB(\d+)\.DBX(\d+)\.([0-7])$/)
  if (match) return { area: 'DB', dbNumber: Number(match[1]), byteOffset: Number(match[2]), bitOffset: Number(match[3]), dataType: 'BOOL' }

  match = source.match(/^DB(\d+)\.DB([BWD])(\d+)$/)
  if (match) {
    const inferred = match[2] === 'B' ? 'BYTE' : match[2] === 'W' ? 'INT' : normalizeDataType(dataTypeHint) || 'REAL'
    return { area: 'DB', dbNumber: Number(match[1]), byteOffset: Number(match[3]), dataType: inferred === 'TIME' ? 'TIME' : inferred }
  }

  match = source.match(/^([IQM])(\d+)\.([0-7])$/)
  if (match) return { area: match[1], byteOffset: Number(match[2]), bitOffset: Number(match[3]), dataType: 'BOOL' }

  match = source.match(/^([IQM])([BWD])(\d+)$/)
  if (match) {
    const inferred = match[2] === 'B' ? 'BYTE' : match[2] === 'W' ? 'INT' : normalizeDataType(dataTypeHint) || 'REAL'
    return { area: match[1], byteOffset: Number(match[3]), dataType: inferred === 'TIME' ? 'TIME' : inferred }
  }

  throw new Error('仅支持 DB 绝对偏移及 I/Q/M 绝对地址。')
}

export function validateTag(tag) {
  const errors = {}
  const area = String(tag.area || '').toUpperCase()
  const dataType = String(tag.dataType || '').toUpperCase()
  if (!String(tag.name || '').trim()) errors.name = '请输入变量名称。'
  if (!AREAS.has(area)) errors.area = '请选择有效存储区。'
  if (!DATA_TYPES.has(dataType)) errors.dataType = '请选择支持的数据类型。'
  if (area === 'DB' && (!Number.isInteger(Number(tag.dbNumber)) || Number(tag.dbNumber) < 1 || Number(tag.dbNumber) > 65535)) {
    errors.dbNumber = 'DB 编号必须为 1–65535。'
  }
  if (!Number.isInteger(Number(tag.byteOffset)) || Number(tag.byteOffset) < 0 || Number(tag.byteOffset) > 16777215) {
    errors.byteOffset = '字节偏移必须为非负整数。'
  }
  if (dataType === 'BOOL') {
    if (!Number.isInteger(Number(tag.bitOffset)) || Number(tag.bitOffset) < 0 || Number(tag.bitOffset) > 7) errors.bitOffset = '位偏移必须为 0–7。'
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateTagCollection(tags) {
  const rowErrors = tags.map((tag) => validateTag(tag))
  const addresses = new Map()
  tags.forEach((tag, index) => {
    if (!rowErrors[index].valid) return
    const address = formatTagAddress(tag)
    if (addresses.has(address)) {
      rowErrors[index].valid = false
      rowErrors[index].errors.address = `地址与第 ${addresses.get(address) + 1} 行重复。`
    } else {
      addresses.set(address, index)
    }
  })
  return { valid: rowErrors.every((result) => result.valid), rows: rowErrors }
}

export function parseTiaCsv(text) {
  const rows = parseDelimited(String(text || '').replace(/^\uFEFF/, ''), detectDelimiter(text))
  if (rows.length < 2) return { valid: [], invalid: [{ row: 1, message: 'CSV 未包含数据行。' }] }

  const headers = rows[0]
  const columns = {
    name: findColumn(headers, 'name'),
    address: findColumn(headers, 'address'),
    dataType: findColumn(headers, 'dataType'),
    comment: findColumn(headers, 'comment'),
  }
  if (columns.name < 0 || columns.address < 0 || columns.dataType < 0) {
    return { valid: [], invalid: [{ row: 1, message: '需要名称、地址和数据类型列。' }] }
  }

  const valid = []
  const invalid = []
  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2
    try {
      const dataType = normalizeDataType(row[columns.dataType])
      if (!DATA_TYPES.has(dataType)) throw new Error(`不支持数据类型 ${dataType || '空值'}。`)
      const parsed = parsePlcAddress(row[columns.address], dataType)
      const tag = {
        ...createEmptyTag(),
        ...parsed,
        dataType,
        name: String(row[columns.name] || '').trim(),
        comment: columns.comment >= 0 ? String(row[columns.comment] || '').trim() : '',
      }
      const result = validateTag(tag)
      if (!result.valid) throw new Error(Object.values(result.errors)[0])
      valid.push(tag)
    } catch (error) {
      invalid.push({ row: rowNumber, message: error instanceof Error ? error.message : '无法解析该行。' })
    }
  })
  return { valid, invalid }
}

export function normalizeWriteValue(dataType, input) {
  if (dataType === 'BOOL') {
    if (typeof input === 'boolean') return input
    if (/^(true|1)$/i.test(String(input))) return true
    if (/^(false|0)$/i.test(String(input))) return false
    throw new Error('BOOL 只接受 TRUE/FALSE 或 1/0。')
  }
  if (dataType === 'TIME') return parseTimeValue(input)
  const value = Number(input)
  if (!Number.isFinite(value)) throw new Error('请输入有效数值。')
  if (dataType === 'BYTE' && (!Number.isInteger(value) || value < 0 || value > 255)) throw new Error('BYTE 必须为 0–255 的整数。')
  if (dataType === 'INT' && (!Number.isInteger(value) || value < -32768 || value > 32767)) throw new Error('INT 必须为 -32768–32767 的整数。')
  return value
}

export function parseTimeValue(input) {
  if (typeof input === 'number' || /^-?\d+$/.test(String(input).trim())) {
    const value = Number(input)
    if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw new Error('TIME 超出 32 位毫秒范围。')
    return value
  }
  const match = String(input).trim().toUpperCase().match(/^T#(-)?(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?(?:(\d+)MS)?$/)
  if (!match) throw new Error('TIME 请使用毫秒整数或 T#1H2M3S 格式。')
  const milliseconds = (((Number(match[2] || 0) * 24 + Number(match[3] || 0)) * 60 + Number(match[4] || 0)) * 60 + Number(match[5] || 0)) * 1000 + Number(match[6] || 0)
  const signed = match[1] ? -milliseconds : milliseconds
  if (signed < -2147483648 || signed > 2147483647) throw new Error('TIME 超出 32 位毫秒范围。')
  return signed
}

export function formatTimeValue(milliseconds) {
  const sign = milliseconds < 0 ? '-' : ''
  let remaining = Math.abs(Number(milliseconds) || 0)
  const days = Math.floor(remaining / 86400000); remaining %= 86400000
  const hours = Math.floor(remaining / 3600000); remaining %= 3600000
  const minutes = Math.floor(remaining / 60000); remaining %= 60000
  const seconds = Math.floor(remaining / 1000); remaining %= 1000
  return `T#${sign}${days ? `${days}D` : ''}${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${seconds ? `${seconds}S` : ''}${remaining || (!days && !hours && !minutes && !seconds) ? `${remaining}MS` : ''}`
}
