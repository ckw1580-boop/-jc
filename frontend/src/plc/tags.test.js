import { describe, expect, it } from 'vitest'

import { formatTagAddress, formatTimeValue, parsePlcAddress, parseTiaCsv, parseTimeValue, validateTagCollection } from './tags'

describe('PLC 前端变量工具', () => {
  it('解析 DB 与 I/Q/M 绝对地址', () => {
    expect(parsePlcAddress('DB1.DBX0.2')).toMatchObject({ area: 'DB', dbNumber: 1, byteOffset: 0, bitOffset: 2, dataType: 'BOOL' })
    expect(parsePlcAddress('%IW10', 'INT')).toMatchObject({ area: 'I', byteOffset: 10, dataType: 'INT' })
    expect(formatTagAddress({ area: 'DB', dbNumber: 8, byteOffset: 4, dataType: 'REAL' })).toBe('DB8.DBD4')
  })

  it('识别重复绝对地址', () => {
    const tag = { name: 'Value', area: 'M', byteOffset: 4, dataType: 'INT' }
    const result = validateTagCollection([{ ...tag, id: 'a' }, { ...tag, id: 'b' }])
    expect(result.valid).toBe(false)
    expect(result.rows[1].errors.address).toContain('重复')
  })

  it('转换 TIME 毫秒和 IEC 文本', () => {
    expect(parseTimeValue('T#1H2M3S4MS')).toBe(3723004)
    expect(formatTimeValue(3723004)).toBe('T#1H2M3S4MS')
  })

  it('导入 TIA 风格的中英文 CSV 列', () => {
    const csv = '变量名称;数据类型;逻辑地址;注释\n启动;Bool;%M0.0;测试\n液位;Real;DB1.DBD4;百分比\n坏变量;String;DB1.DBB8;跳过'
    const result = parseTiaCsv(csv)
    expect(result.valid).toHaveLength(2)
    expect(result.valid[1]).toMatchObject({ name: '液位', area: 'DB', dbNumber: 1, byteOffset: 4, dataType: 'REAL' })
    expect(result.invalid).toHaveLength(1)
  })
})
