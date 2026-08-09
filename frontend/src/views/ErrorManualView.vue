<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { errorEntries } from '../data/errorManual'

const route = useRoute()
const router = useRouter()
const search = ref(String(route.query.q || ''))
const series = ref(String(route.query.series || 'all'))
const severity = ref(String(route.query.severity || 'all'))
const selectedCode = ref(String(route.query.code || errorEntries[0].code))

const severityLabels = { high: '高', medium: '中', low: '低' }

const filteredEntries = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return errorEntries.filter((entry) => {
    const matchesKeyword = !keyword || [entry.code, entry.title, entry.symptom, entry.cause].join(' ').toLowerCase().includes(keyword)
    const matchesSeries = series.value === 'all' || entry.series === '通用' || entry.series === series.value
    const matchesSeverity = severity.value === 'all' || entry.severity === severity.value
    return matchesKeyword && matchesSeries && matchesSeverity
  })
})

const selectedEntry = computed(() =>
  filteredEntries.value.find((entry) => entry.code === selectedCode.value) || filteredEntries.value[0] || null,
)

watch(
  [search, series, severity, selectedCode],
  () => {
    const query = {}
    if (search.value) query.q = search.value
    if (series.value !== 'all') query.series = series.value
    if (severity.value !== 'all') query.severity = severity.value
    if (selectedEntry.value) query.code = selectedEntry.value.code
    router.replace({ path: '/errors', query })
  },
)

watch(
  () => route.query,
  (query) => {
    const nextSearch = typeof query.q === 'string' ? query.q : ''
    const nextSeries = ['all', 'S7-1200', 'S7-1500'].includes(query.series) ? query.series : 'all'
    const nextSeverity = ['all', 'high', 'medium', 'low'].includes(query.severity) ? query.severity : 'all'
    const nextCode = typeof query.code === 'string' ? query.code : ''

    if (search.value !== nextSearch) search.value = nextSearch
    if (series.value !== nextSeries) series.value = nextSeries
    if (severity.value !== nextSeverity) severity.value = nextSeverity
    if (selectedCode.value !== nextCode) selectedCode.value = nextCode
  },
)

watch(filteredEntries, () => {
  if (!filteredEntries.value.some((entry) => entry.code === selectedCode.value)) {
    selectedCode.value = filteredEntries.value[0]?.code || ''
  }
})

function resetFilters() {
  search.value = ''
  series.value = 'all'
  severity.value = 'all'
  selectedCode.value = errorEntries[0].code
}
</script>

<template>
  <section class="full-view error-manual" aria-labelledby="errors-title">
    <header class="view-heading">
      <div>
        <p class="utility-label">DIAGNOSTIC REFERENCE</p>
        <h1 id="errors-title">错误信息手册</h1>
        <p>检索连接、组态和模拟变量故障，并查看建议处理步骤。</p>
      </div>
      <span class="demo-warning"><i aria-hidden="true">!</i>非官方演示数据</span>
    </header>

    <div class="manual-notice" role="note">
      <strong>数据声明</strong>
      <p>所有 <span class="mono">SIM-*</span> 条目均为界面演示数据，不是 Siemens 官方诊断代码。真实设备维护请查阅对应型号与固件版本的官方手册。</p>
    </div>

    <form class="manual-filters" role="search" @submit.prevent>
      <label class="field search-field">
        <span>搜索错误</span>
        <input v-model="search" name="error-search" type="search" autocomplete="off" spellcheck="false" placeholder="例如：SIM-CONN-001…" />
      </label>
      <label class="field">
        <span>PLC 系列</span>
        <select v-model="series" name="error-series" autocomplete="off">
          <option value="all">全部系列</option>
          <option value="S7-1200">S7-1200</option>
          <option value="S7-1500">S7-1500</option>
        </select>
      </label>
      <label class="field">
        <span>严重度</span>
        <select v-model="severity" name="error-severity" autocomplete="off">
          <option value="all">全部级别</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </label>
    </form>

    <div class="manual-workspace">
      <section class="error-list-panel" aria-labelledby="error-list-title">
        <div class="section-heading">
          <div><span class="utility-label">RESULTS</span><h2 id="error-list-title">诊断条目</h2></div>
          <span>{{ filteredEntries.length }} 条</span>
        </div>
        <div v-if="filteredEntries.length" class="error-list">
          <button
            v-for="entry in filteredEntries"
            :key="entry.code"
            type="button"
            :class="{ selected: selectedEntry?.code === entry.code }"
            :aria-pressed="selectedEntry?.code === entry.code"
            @click="selectedCode = entry.code"
          >
            <span class="error-list-meta"><b class="mono" translate="no">{{ entry.code }}</b><i :class="`severity-${entry.severity}`">{{ severityLabels[entry.severity] }}</i></span>
            <strong>{{ entry.title }}</strong>
            <small>{{ entry.series }}</small>
          </button>
        </div>
        <div v-else class="filter-empty" aria-live="polite">
          <strong>没有匹配条目</strong>
          <p>更换关键词或重置筛选条件后再试。</p>
          <button class="button button-secondary" type="button" @click="resetFilters">重置筛选</button>
        </div>
      </section>

      <article v-if="selectedEntry" class="error-detail" aria-labelledby="error-detail-title">
        <header>
          <div><span class="utility-label mono" translate="no">{{ selectedEntry.code }}</span><h2 id="error-detail-title">{{ selectedEntry.title }}</h2></div>
          <span class="severity-pill" :class="`severity-${selectedEntry.severity}`">严重度：{{ severityLabels[selectedEntry.severity] }}</span>
        </header>
        <section><h3>现象</h3><p>{{ selectedEntry.symptom }}</p></section>
        <section><h3>可能原因</h3><p>{{ selectedEntry.cause }}</p></section>
        <section>
          <h3>建议步骤</h3>
          <ol>
            <li v-for="(step, index) in selectedEntry.steps" :key="step"><span>{{ String(index + 1).padStart(2, '0') }}</span>{{ step }}</li>
          </ol>
        </section>
      </article>
      <div v-else class="error-detail-empty">选择左侧诊断条目以查看详情。</div>
    </div>
  </section>
</template>
