import { computed, reactive, watch } from 'vue'

import { formatTagAddress } from '../plc/tags'
import { PlcGatewayError, plcGateway } from '../services/plcGateway'
import { useSettings } from './useSettings'
import { useUserSession } from './useUserSession'

const { settings } = useSettings()

const simulationTags = [
  { id: 'start', address: 'M0.0', name: 'Start_Command', dataType: 'BOOL', value: false, writable: true, quality: 'good' },
  { id: 'ready', address: 'M0.1', name: 'System_Ready', dataType: 'BOOL', value: false, writable: false, quality: 'good' },
  { id: 'speed', address: 'MW10', name: 'Motor_Speed_Setpoint', dataType: 'INT', value: 1200, writable: true, unit: 'rpm', quality: 'good' },
  { id: 'level', address: 'MD20', name: 'Tank_Level', dataType: 'REAL', value: 62.4, writable: false, unit: '%', quality: 'good' },
  { id: 'reset', address: 'M0.2', name: 'Alarm_Reset', dataType: 'BOOL', value: false, writable: true, quality: 'good', pulse: true },
]

const plc = reactive({
  mode: 'simulation',
  connectionState: 'disconnected',
  profile: { series: 'S7-1200', ip: '192.168.0.1', rack: 0, slot: 1, scenario: 'success', timeoutMs: 5000 },
  connectionId: null,
  cpuMode: 'STOP',
  quality: '离线',
  cycleTime: null,
  lastUpdate: null,
  message: '尚未连接 PLC',
  activeFault: null,
  tags: simulationTags.map((tag) => ({ ...tag })),
  monitoring: false,
  writeUnlocked: false,
  tick: 0,
  trend: [48, 51, 55, 58, 60, 59, 62, 64, 63, 62],
  gatewayStatus: 'unchecked',
})

let connectionTimer = null
let updateTimer = null
let pulseTimer = null
let heartbeatTimer = null
let pollBusy = false
let connectionAttempt = 0
let restoredProfileKey = ''

const connectionLabels = { disconnected: '未连接', connecting: '正在连接…', connected: '连接正常', fault: '连接故障' }
const connectionLabel = computed(() => connectionLabels[plc.connectionState])
const isConnected = computed(() => plc.connectionState === 'connected')
const isReal = computed(() => plc.mode === 'real')

function clearTimers() {
  if (connectionTimer) window.clearTimeout(connectionTimer)
  if (updateTimer) window.clearInterval(updateTimer)
  if (heartbeatTimer) window.clearInterval(heartbeatTimer)
  connectionTimer = null
  updateTimer = null
  heartbeatTimer = null
  pollBusy = false
}

function setFault(code, message) {
  plc.connectionState = 'fault'
  plc.quality = '故障'
  plc.cpuMode = plc.mode === 'real' ? '未知' : 'STOP'
  plc.message = message
  plc.activeFault = code
  plc.monitoring = false
  plc.writeUnlocked = false
  clearTimers()
}

function mapGatewayFault(error) {
  if (error instanceof PlcGatewayError) {
    if (error.status === 401) return { code: 'REAL-GW-002', message: '本地网关配对已失效，请重新配对。' }
    if (error.code?.startsWith('REAL-')) return { code: error.code, message: error.message }
  }
  return { code: 'REAL-GW-001', message: error instanceof Error ? error.message : '本地 PLC 网关不可用。' }
}

function updateSimulation() {
  plc.tick += 1
  const levelTag = plc.tags.find((tag) => tag.id === 'level')
  const readyTag = plc.tags.find((tag) => tag.id === 'ready')
  const level = 62 + Math.sin(plc.tick / 2.4) * 7
  levelTag.value = Number(level.toFixed(1))
  readyTag.value = plc.cpuMode === 'RUN'
  plc.cycleTime = Number((2.1 + (plc.tick % 5) * 0.08).toFixed(2))
  plc.lastUpdate = new Date()
  plc.trend.push(levelTag.value)
  if (plc.trend.length > 24) plc.trend.shift()
}

function startSimulationLoop() {
  if (updateTimer) window.clearInterval(updateTimer)
  updateSimulation()
  updateTimer = window.setInterval(updateSimulation, settings.refreshInterval)
}

function connectSimulation() {
  clearTimers()
  plc.mode = 'simulation'
  plc.connectionState = 'connecting'
  plc.cpuMode = 'STOP'
  plc.quality = '检测中'
  plc.message = `正在建立 ${plc.profile.ip} 的模拟会话…`
  plc.activeFault = null
  plc.tags = simulationTags.map((tag) => ({ ...tag }))
  connectionTimer = window.setTimeout(() => {
    if (plc.profile.scenario === 'success') {
      plc.connectionState = 'connected'
      plc.cpuMode = 'RUN'
      plc.quality = '良好'
      plc.message = `${plc.profile.series} 模拟连接已建立`
      startSimulationLoop()
    } else if (plc.profile.scenario === 'timeout') {
      setFault('SIM-CONN-001', '连接超时，请检查 IP 地址与网络路径')
    } else {
      setFault('SIM-CFG-002', '组态不匹配，请核对 PLC 系列与插槽设置')
    }
  }, 1300)
}

function profileStorageKey() {
  const { user } = useUserSession()
  return user.value?.userId ? `s7-real-plc-profiles:v1:${user.value.userId}` : ''
}

function loadRealTags() {
  const key = profileStorageKey()
  if (!key) return []
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}')
    const tags = Array.isArray(stored.tags) ? stored.tags : []
    return tags.map((tag) => ({ ...tag, address: formatTagAddress(tag), value: null, quality: 'unknown', timestamp: null, error: '' }))
  } catch {
    return []
  }
}

function restoreRealProfile() {
  const key = profileStorageKey()
  if (!key || restoredProfileKey === key) return
  restoredProfileKey = key
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}')
    if (stored.profile && typeof stored.profile === 'object') {
      const { series, ip, rack, slot, timeoutMs } = stored.profile
      if (['S7-1200', 'S7-1500'].includes(series)) plc.profile.series = series
      if (typeof ip === 'string') plc.profile.ip = ip
      if (Number.isInteger(rack)) plc.profile.rack = rack
      if (Number.isInteger(slot)) plc.profile.slot = slot
      if (Number.isInteger(timeoutMs)) plc.profile.timeoutMs = timeoutMs
    }
  } catch {
    // 损坏的本地配置不应阻止手动连接。
  }
}

function saveRealTags(tags) {
  const key = profileStorageKey()
  if (!key) return
  const safeTags = tags.map(({ value, quality, timestamp, error, address, ...tag }) => tag)
  localStorage.setItem(key, JSON.stringify({ version: 1, profile: { ...plc.profile, scenario: undefined }, tags: safeTags }))
}

async function connectReal() {
  const attempt = ++connectionAttempt
  clearTimers()
  plc.mode = 'real'
  plc.connectionState = 'connecting'
  plc.cpuMode = '未知'
  plc.quality = '检测中'
  plc.message = '正在检查 Windows 本地 PLC 网关…'
  plc.activeFault = null
  plc.writeUnlocked = false
  try {
    await plcGateway.health()
    if (attempt !== connectionAttempt) return { cancelled: true }
    plc.gatewayStatus = 'online'
    if (!plcGateway.hasToken()) {
      plc.connectionState = 'disconnected'
      plc.quality = '等待配对'
      plc.message = '本地网关已运行，请输入托盘中显示的配对码。'
      return { pairingRequired: true }
    }
    const result = await plcGateway.connect({
      series: plc.profile.series,
      ip: plc.profile.ip,
      rack: Number(plc.profile.rack),
      slot: Number(plc.profile.slot),
      timeoutMs: Number(plc.profile.timeoutMs || 5000),
    })
    if (attempt !== connectionAttempt) {
      await plcGateway.disconnect(result.connectionId).catch(() => undefined)
      return { cancelled: true }
    }
    plc.connectionId = result.connectionId
    plc.connectionState = 'connected'
    plc.quality = result.quality || '已连接'
    plc.message = result.message || '实际 PLC 会话已建立。'
    plc.tags = loadRealTags()
    saveRealTags(plc.tags)
    plc.monitoring = false
    heartbeatTimer = window.setInterval(() => {
      plcGateway.heartbeat(plc.connectionId).catch((error) => {
        const fault = mapGatewayFault(error)
        setFault(fault.code, fault.message)
      })
    }, 5000)
    return { pairingRequired: false }
  } catch (error) {
    if (attempt !== connectionAttempt) return { cancelled: true }
    const fault = mapGatewayFault(error)
    setFault(fault.code, fault.message)
    throw error
  }
}

async function pairGateway(code) {
  const result = await plcGateway.pair(code)
  plc.gatewayStatus = 'paired'
  plc.message = '本地网关配对成功，正在建立实际连接…'
  return result
}

async function pollSnapshot() {
  if (!plc.connectionId || pollBusy || !plc.monitoring) return
  pollBusy = true
  try {
    const result = await plcGateway.snapshot(plc.connectionId)
    const values = new Map(result.tags.map((tag) => [tag.id, tag]))
    plc.tags.forEach((tag) => Object.assign(tag, values.get(tag.id) || { quality: 'bad', error: '网关未返回该变量。' }))
    plc.quality = result.quality || '良好'
    plc.cycleTime = result.cycleTimeMs ?? settings.refreshInterval
    plc.lastUpdate = new Date(result.timestamp || Date.now())
  } catch (error) {
    const fault = mapGatewayFault(error)
    setFault(fault.code, fault.message)
  } finally {
    pollBusy = false
  }
}

async function startRealMonitoring(tags) {
  if (!isConnected.value || plc.mode !== 'real') return
  const normalized = tags.map((tag) => {
    const normalizedTag = { ...tag, address: formatTagAddress(tag) }
    if (normalizedTag.dataType !== 'BOOL') delete normalizedTag.bitOffset
    if (normalizedTag.area !== 'DB') delete normalizedTag.dbNumber
    return normalizedTag
  })
  await plcGateway.configureTags(plc.connectionId, normalized)
  await plcGateway.startMonitoring(plc.connectionId, settings.refreshInterval)
  plc.tags = normalized.map((tag) => ({ ...tag, value: null, quality: 'unknown', timestamp: null, error: '' }))
  saveRealTags(plc.tags)
  plc.monitoring = true
  plc.message = `正在监控 ${plc.tags.length} 个实际变量。`
  await pollSnapshot()
  updateTimer = window.setInterval(pollSnapshot, settings.refreshInterval)
}

async function stopRealMonitoring() {
  if (updateTimer) window.clearInterval(updateTimer)
  updateTimer = null
  if (plc.connectionId) await plcGateway.stopMonitoring(plc.connectionId)
  plc.monitoring = false
  plc.writeUnlocked = false
  plc.message = '实际变量监控已停止，可以编辑变量表。'
}

async function disconnect() {
  connectionAttempt += 1
  const connectionId = plc.connectionId
  clearTimers()
  if (plc.mode === 'real' && connectionId) {
    await plcGateway.disconnect(connectionId).catch(() => undefined)
  }
  plc.connectionState = 'disconnected'
  plc.connectionId = null
  plc.cpuMode = plc.mode === 'real' ? '未知' : 'STOP'
  plc.quality = '离线'
  plc.cycleTime = null
  plc.lastUpdate = null
  plc.message = 'PLC 已断开'
  plc.activeFault = null
  plc.monitoring = false
  plc.writeUnlocked = false
}

function cancelConnection() {
  if (plc.connectionState !== 'connecting') return
  clearTimers()
  connectionAttempt += 1
  plc.connectionState = 'disconnected'
  plc.quality = '离线'
  plc.message = '已取消连接'
}

function setSimulationTagValue(id, value) {
  if (!isConnected.value || plc.mode !== 'simulation') return
  const tag = plc.tags.find((item) => item.id === id)
  if (!tag?.writable) return
  tag.value = value
  plc.lastUpdate = new Date()
}

function pulseSimulationTag(id) {
  setSimulationTagValue(id, true)
  if (pulseTimer) window.clearTimeout(pulseTimer)
  pulseTimer = window.setTimeout(() => setSimulationTagValue(id, false), 450)
}

async function writeRealTag(tagId, value) {
  if (!plc.writeUnlocked) throw new Error('请先确认设备处于安全调试状态。')
  const preview = await plcGateway.previewWrite(plc.connectionId, tagId, value)
  const result = await plcGateway.commitWrite(plc.connectionId, preview.writeToken)
  await pollSnapshot()
  return result
}

async function setRealWriteUnlocked(unlocked) {
  if (!plc.connectionId || !plc.monitoring) return
  try {
    await plcGateway.setWriteUnlock(plc.connectionId, unlocked)
    plc.writeUnlocked = unlocked
  } catch (error) {
    plc.writeUnlocked = false
    throw error
  }
}

watch(
  () => settings.refreshInterval,
  async () => {
    if (!isConnected.value) return
    if (plc.mode === 'simulation') startSimulationLoop()
    else if (plc.monitoring) {
      if (updateTimer) window.clearInterval(updateTimer)
      await plcGateway.startMonitoring(plc.connectionId, settings.refreshInterval)
      updateTimer = window.setInterval(pollSnapshot, settings.refreshInterval)
    }
  },
)

export function usePlcConnection() {
  restoreRealProfile()
  return {
    plc,
    connectionLabel,
    isConnected,
    isReal,
    connectSimulation,
    connectReal,
    pairGateway,
    cancelConnection,
    disconnect,
    startRealMonitoring,
    stopRealMonitoring,
    setSimulationTagValue,
    pulseSimulationTag,
    writeRealTag,
    setRealWriteUnlocked,
    saveRealTags,
  }
}
