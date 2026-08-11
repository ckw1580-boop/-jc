<script setup>
import { computed } from 'vue'

import { usePlcConnection } from '../composables/usePlcConnection'
import StatusBadge from './StatusBadge.vue'

const { plc, connectionLabel } = usePlcConnection()
const timeLabel = computed(() =>
  plc.lastUpdate
    ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(plc.lastUpdate)
    : '--:--:--',
)
</script>

<template>
  <footer class="status-bar" aria-live="polite">
    <StatusBadge :state="plc.connectionState" :label="connectionLabel" />
    <span class="status-item"><b>通道</b>{{ plc.mode === 'real' ? '实际' : '模拟' }}</span>
    <span class="status-item"><b>设备</b>{{ plc.profile.series }}</span>
    <span class="status-item"><b>地址</b><span translate="no">{{ plc.profile.ip }}</span></span>
    <span class="status-item status-message">{{ plc.message }}</span>
    <span class="status-item status-time"><b>刷新</b>{{ timeLabel }}</span>
  </footer>
</template>
