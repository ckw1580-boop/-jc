<script setup>
import { computed } from 'vue'

import { usePlcSimulator } from '../composables/usePlcSimulator'
import StatusBadge from './StatusBadge.vue'

const { simulator, connectionLabel } = usePlcSimulator()
const timeLabel = computed(() =>
  simulator.lastUpdate
    ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(simulator.lastUpdate)
    : '--:--:--',
)
</script>

<template>
  <footer class="status-bar" aria-live="polite">
    <StatusBadge :state="simulator.connectionState" :label="connectionLabel" />
    <span class="status-item"><b>设备</b>{{ simulator.profile.series }}</span>
    <span class="status-item"><b>地址</b><span translate="no">{{ simulator.profile.ip }}</span></span>
    <span class="status-item status-message">{{ simulator.message }}</span>
    <span class="status-item status-time"><b>刷新</b>{{ timeLabel }}</span>
  </footer>
</template>
