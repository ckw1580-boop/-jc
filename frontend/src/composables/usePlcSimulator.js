import { computed, reactive, watch } from 'vue'

import { useSettings } from './useSettings'

const { settings } = useSettings()

const simulator = reactive({
  connectionState: 'disconnected',
  profile: {
    series: 'S7-1200',
    ip: '192.168.0.1',
    rack: 0,
    slot: 1,
    scenario: 'success',
  },
  cpuMode: 'STOP',
  quality: '离线',
  cycleTime: null,
  lastUpdate: null,
  message: '尚未连接 PLC',
  activeFault: null,
  tick: 0,
  tags: [
    { id: 'start', address: 'M0.0', name: 'Start_Command', type: 'BOOL', value: false, writable: true },
    { id: 'ready', address: 'M0.1', name: 'System_Ready', type: 'BOOL', value: false, writable: false },
    { id: 'speed', address: 'MW10', name: 'Motor_Speed_Setpoint', type: 'INT', value: 1200, writable: true, unit: 'rpm' },
    { id: 'level', address: 'MD20', name: 'Tank_Level', type: 'REAL', value: 62.4, writable: false, unit: '%' },
    { id: 'reset', address: 'M0.2', name: 'Alarm_Reset', type: 'PULSE', value: false, writable: true },
  ],
  trend: [48, 51, 55, 58, 60, 59, 62, 64, 63, 62],
})

let connectionTimer = null
let updateTimer = null
let pulseTimer = null

const connectionLabels = {
  disconnected: '未连接',
  connecting: '正在连接…',
  connected: '连接正常',
  fault: '连接故障',
}

const connectionLabel = computed(() => connectionLabels[simulator.connectionState])
const isConnected = computed(() => simulator.connectionState === 'connected')

function clearConnectionTimer() {
  if (connectionTimer) window.clearTimeout(connectionTimer)
  connectionTimer = null
}

function stopDataLoop() {
  if (updateTimer) window.clearInterval(updateTimer)
  updateTimer = null
}

function updateData() {
  simulator.tick += 1
  const levelTag = simulator.tags.find((tag) => tag.id === 'level')
  const readyTag = simulator.tags.find((tag) => tag.id === 'ready')
  const level = 62 + Math.sin(simulator.tick / 2.4) * 7
  levelTag.value = Number(level.toFixed(1))
  readyTag.value = simulator.cpuMode === 'RUN'
  simulator.cycleTime = Number((2.1 + (simulator.tick % 5) * 0.08).toFixed(2))
  simulator.lastUpdate = new Date()
  simulator.trend.push(levelTag.value)
  if (simulator.trend.length > 24) simulator.trend.shift()
}

function startDataLoop() {
  stopDataLoop()
  updateData()
  updateTimer = window.setInterval(updateData, settings.refreshInterval)
}

function completeConnection() {
  if (simulator.profile.scenario === 'success') {
    simulator.connectionState = 'connected'
    simulator.cpuMode = 'RUN'
    simulator.quality = '良好'
    simulator.message = `${simulator.profile.series} 模拟连接已建立`
    simulator.activeFault = null
    startDataLoop()
    return
  }

  simulator.connectionState = 'fault'
  simulator.cpuMode = 'STOP'
  simulator.quality = '故障'
  if (simulator.profile.scenario === 'timeout') {
    simulator.activeFault = 'SIM-CONN-001'
    simulator.message = '连接超时，请检查 IP 地址与网络路径'
  } else {
    simulator.activeFault = 'SIM-CFG-002'
    simulator.message = '组态不匹配，请核对 PLC 系列与插槽设置'
  }
  stopDataLoop()
}

function connect() {
  clearConnectionTimer()
  stopDataLoop()
  simulator.connectionState = 'connecting'
  simulator.cpuMode = 'STOP'
  simulator.quality = '检测中'
  simulator.message = `正在检测 ${simulator.profile.ip}…`
  simulator.activeFault = null
  connectionTimer = window.setTimeout(completeConnection, 1300)
}

function cancelConnection() {
  if (simulator.connectionState !== 'connecting') return
  clearConnectionTimer()
  simulator.connectionState = 'disconnected'
  simulator.quality = '离线'
  simulator.message = '已取消连接'
}

function disconnect() {
  clearConnectionTimer()
  stopDataLoop()
  simulator.connectionState = 'disconnected'
  simulator.cpuMode = 'STOP'
  simulator.quality = '离线'
  simulator.cycleTime = null
  simulator.lastUpdate = null
  simulator.message = 'PLC 已断开'
  simulator.activeFault = null
  simulator.tags.find((tag) => tag.id === 'ready').value = false
}

function setTagValue(id, value) {
  if (!isConnected.value) return
  const tag = simulator.tags.find((item) => item.id === id)
  if (!tag?.writable) return
  tag.value = value
  simulator.lastUpdate = new Date()
}

function pulseTag(id) {
  if (!isConnected.value) return
  setTagValue(id, true)
  if (pulseTimer) window.clearTimeout(pulseTimer)
  pulseTimer = window.setTimeout(() => setTagValue(id, false), 450)
}

watch(
  () => settings.refreshInterval,
  () => {
    if (isConnected.value) startDataLoop()
  },
)

export function usePlcSimulator() {
  return {
    simulator,
    connectionLabel,
    isConnected,
    connect,
    cancelConnection,
    disconnect,
    setTagValue,
    pulseTag,
  }
}
