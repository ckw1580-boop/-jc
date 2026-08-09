<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import StatusBadge from '../components/StatusBadge.vue'
import { usePlcSimulator } from '../composables/usePlcSimulator'

const { simulator, connectionLabel, isConnected, setTagValue, pulseTag } = usePlcSimulator()

const trendPoints = computed(() => {
  const values = simulator.trend
  const min = Math.min(...values) - 2
  const max = Math.max(...values) + 2
  const span = Math.max(max - min, 1)
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 600
      const y = 132 - ((value - min) / span) * 104
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

function updateNumericTag(tag, event) {
  const value = Number(event.target.value)
  if (Number.isFinite(value)) setTagValue(tag.id, value)
}
</script>

<template>
  <section class="full-view interaction-view" aria-labelledby="interaction-title">
    <header class="view-heading">
      <div>
        <p class="utility-label">INTERACTION / WATCH TABLE</p>
        <h1 id="interaction-title">变量监视与控制</h1>
        <p>监视模拟 I/O、写入设定值并观察过程趋势。</p>
      </div>
      <StatusBadge :state="simulator.connectionState" :label="connectionLabel" />
    </header>

    <div v-if="!isConnected" class="empty-state">
      <div class="empty-state-code" aria-hidden="true">OFFLINE</div>
      <div>
        <p class="utility-label">CONNECTION REQUIRED</p>
        <h2>先连接模拟 PLC</h2>
        <p>变量监视与写入操作只有在连接状态正常时才会启用。</p>
        <RouterLink class="button button-primary" to="/connection/status">前往连接页面</RouterLink>
      </div>
    </div>

    <template v-else>
      <div class="interaction-toolbar">
        <div><span>设备</span><strong>{{ simulator.profile.series }}</strong></div>
        <div><span>CPU</span><strong class="text-success">{{ simulator.cpuMode }}</strong></div>
        <div><span>刷新周期</span><strong class="mono">{{ simulator.cycleTime }} ms</strong></div>
        <div><span>变量质量</span><strong>{{ simulator.quality }}</strong></div>
      </div>

      <div class="interaction-grid">
        <section class="watch-panel" aria-labelledby="watch-title">
          <div class="section-heading">
            <div><span class="utility-label">LIVE DATA</span><h2 id="watch-title">变量表</h2></div>
            <span>{{ simulator.tags.length }} 个变量</span>
          </div>
          <div class="table-scroll" tabindex="0" aria-label="可横向滚动的变量表">
            <table class="watch-table">
              <thead>
                <tr><th scope="col">地址</th><th scope="col">变量名称</th><th scope="col">类型</th><th scope="col">当前值</th><th scope="col">操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="tag in simulator.tags" :key="tag.id">
                  <td class="mono" translate="no">{{ tag.address }}</td>
                  <td><strong translate="no">{{ tag.name }}</strong><small>{{ tag.writable ? '可写' : '只读' }}</small></td>
                  <td class="mono">{{ tag.type }}</td>
                  <td class="value-cell mono">
                    <span v-if="tag.type === 'BOOL' || tag.type === 'PULSE'" :class="{ 'text-success': tag.value }">{{ tag.value ? 'TRUE' : 'FALSE' }}</span>
                    <span v-else>{{ tag.value }} {{ tag.unit || '' }}</span>
                  </td>
                  <td>
                    <button
                      v-if="tag.type === 'BOOL' && tag.writable"
                      class="table-action"
                      type="button"
                      :aria-pressed="tag.value"
                      @click="setTagValue(tag.id, !tag.value)"
                    >
                      {{ tag.value ? '关闭' : '开启' }}
                    </button>
                    <label v-else-if="tag.type === 'INT' && tag.writable" class="inline-number">
                      <span class="sr-only">设置 {{ tag.name }}</span>
                      <input
                        :value="tag.value"
                        :name="`tag-${tag.id}`"
                        type="number"
                        inputmode="numeric"
                        min="0"
                        max="3000"
                        step="50"
                        autocomplete="off"
                        @change="updateNumericTag(tag, $event)"
                      />
                    </label>
                    <button v-else-if="tag.type === 'PULSE'" class="table-action" type="button" @click="pulseTag(tag.id)">发送脉冲</button>
                    <span v-else class="read-only-label">只读</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="trend-panel" aria-labelledby="trend-title">
          <div class="section-heading">
            <div><span class="utility-label">PROCESS TREND</span><h2 id="trend-title">液位趋势</h2></div>
            <strong class="trend-value mono">{{ simulator.tags.find((tag) => tag.id === 'level').value }}%</strong>
          </div>
          <div class="trend-chart">
            <svg viewBox="0 0 600 160" role="img" aria-label="模拟液位最近 24 个采样点的趋势折线图">
              <g class="chart-grid" aria-hidden="true">
                <path d="M0 28H600M0 80H600M0 132H600" />
                <path d="M0 0V160M150 0V160M300 0V160M450 0V160M600 0V160" />
              </g>
              <polyline class="trend-line" :points="trendPoints" />
            </svg>
            <div class="chart-axis"><span>较早</span><span>实时</span></div>
          </div>
          <p class="chart-note">趋势数据由前端模拟器按设置中的刷新周期生成。</p>
        </section>
      </div>
    </template>
  </section>
</template>
