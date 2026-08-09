<script setup>
import { computed } from 'vue'

const props = defineProps({
  series: { type: String, default: 'S7-1500' },
  state: { type: String, default: 'disconnected' },
  compact: { type: Boolean, default: false },
})

const modules = computed(() =>
  props.series === 'S7-1200'
    ? [
        { type: 'PWR', label: 'PS', channels: 2 },
        { type: 'CPU', label: 'CPU 12xx', channels: 4 },
        { type: 'DI', label: 'DI 16', channels: 6 },
        { type: 'DO', label: 'DO 16', channels: 6 },
        { type: 'CM', label: 'CM', channels: 3 },
      ]
    : [
        { type: 'PWR', label: 'PS', channels: 2 },
        { type: 'CPU', label: 'CPU 15xx', channels: 4 },
        { type: 'DI', label: 'DI 32', channels: 7 },
        { type: 'DO', label: 'DO 32', channels: 7 },
        { type: 'AI', label: 'AI 8', channels: 5 },
        { type: 'TM', label: 'TM', channels: 4 },
        { type: 'CM', label: 'CM', channels: 3 },
      ],
)

const rackLabel = computed(() => `${props.series} 模拟机架，状态：${props.state}`)
</script>

<template>
  <figure class="plc-rack" :class="[{ compact }, `rack-${state}`]" :aria-label="rackLabel">
    <div class="rack-topline">
      <span>{{ series }}</span>
      <span>SIMULATED RACK / 01</span>
    </div>
    <div class="rack-rail" aria-hidden="true">
      <div v-for="(module, index) in modules" :key="`${module.type}-${index}`" class="plc-module" :class="`module-${module.type.toLowerCase()}`">
        <div class="module-cap"><span>{{ module.type }}</span><i></i></div>
        <strong>{{ module.label }}</strong>
        <div class="module-leds">
          <i v-for="channel in module.channels" :key="channel" :class="{ active: state === 'connected' && (channel + index) % 3 !== 0 }"></i>
        </div>
        <span class="module-index">{{ String(index + 1).padStart(2, '0') }}</span>
      </div>
    </div>
    <figcaption>
      <span>CPU 与扩展模块示意</span>
      <span>非产品尺寸图</span>
    </figcaption>
  </figure>
</template>
