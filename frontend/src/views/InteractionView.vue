<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import StatusBadge from '../components/StatusBadge.vue'
import { usePlcConnection } from '../composables/usePlcConnection'
import { createEmptyTag, formatTagAddress, formatTimeValue, normalizeWriteValue, parseTiaCsv, validateTagCollection } from '../plc/tags'

const {
  plc,
  connectionLabel,
  isConnected,
  isReal,
  startRealMonitoring,
  stopRealMonitoring,
  setSimulationTagValue,
  pulseSimulationTag,
  writeRealTag,
  setRealWriteUnlocked,
} = usePlcConnection()

const draftTags = ref([])
const csvInput = ref(null)
const csvPreview = reactive({ fileName: '', valid: [], invalid: [] })
const tableMessage = ref('')
const busy = ref(false)
const proposedValues = reactive({})
const writeDialog = ref(null)
const writeValueInput = ref(null)
const writeState = reactive({ tag: null, value: '', error: '', busy: false })

const tagValidation = computed(() => validateTagCollection(draftTags.value))
const trendPoints = computed(() => {
  const values = plc.trend
  const min = Math.min(...values) - 2
  const max = Math.max(...values) + 2
  const span = Math.max(max - min, 1)
  return values.map((value, index) => `${((index / Math.max(values.length - 1, 1)) * 600).toFixed(1)},${(132 - ((value - min) / span) * 104).toFixed(1)}`).join(' ')
})
const levelValue = computed(() => plc.tags.find((tag) => tag.id === 'level')?.value ?? '—')

watch(
  [isReal, isConnected],
  ([real, connected]) => {
    if (real && connected && !plc.monitoring) draftTags.value = plc.tags.map(({ value, quality, timestamp, error, address, ...tag }) => ({ ...tag }))
  },
  { immediate: true },
)

function addTag() {
  draftTags.value.push(createEmptyTag())
}

function removeTag(index) {
  draftTags.value.splice(index, 1)
}

async function importCsv(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const result = parseTiaCsv(await file.text())
  csvPreview.fileName = file.name
  csvPreview.valid = result.valid
  csvPreview.invalid = result.invalid
}

function confirmCsvImport() {
  draftTags.value.push(...csvPreview.valid)
  tableMessage.value = `已导入 ${csvPreview.valid.length} 个变量，跳过 ${csvPreview.invalid.length} 行。`
  csvPreview.fileName = ''
  csvPreview.valid = []
  csvPreview.invalid = []
  if (csvInput.value) csvInput.value.value = ''
}

function clearCsvPreview() {
  csvPreview.fileName = ''
  csvPreview.valid = []
  csvPreview.invalid = []
  if (csvInput.value) csvInput.value.value = ''
}

async function startMonitoring() {
  tableMessage.value = ''
  if (!draftTags.value.length) {
    tableMessage.value = '请先添加至少一个实际变量。'
    return
  }
  if (!tagValidation.value.valid) {
    tableMessage.value = '变量表存在错误，请按行修正后重试。'
    return
  }
  busy.value = true
  try {
    await startRealMonitoring(draftTags.value)
    tableMessage.value = '实际变量监控已启动。'
  } catch (error) {
    tableMessage.value = error instanceof Error ? error.message : '无法启动实际变量监控。'
  } finally {
    busy.value = false
  }
}

async function stopMonitoring() {
  busy.value = true
  try {
    await stopRealMonitoring()
    draftTags.value = plc.tags.map(({ value, quality, timestamp, error, address, ...tag }) => ({ ...tag }))
  } catch (error) {
    tableMessage.value = error instanceof Error ? error.message : '无法停止变量监控。'
  } finally {
    busy.value = false
  }
}

function updateSimulationNumeric(tag, event) {
  const value = Number(event.target.value)
  if (Number.isFinite(value)) setSimulationTagValue(tag.id, value)
}

async function openWriteDialog(tag, proposedValue = undefined) {
  writeState.tag = tag
  writeState.value = proposedValue ?? proposedValues[tag.id] ?? (tag.dataType === 'BOOL' ? !tag.value : tag.value)
  writeState.error = ''
  writeDialog.value?.showModal()
  await nextTick()
  writeValueInput.value?.focus()
}

async function confirmWrite() {
  writeState.error = ''
  let value
  try {
    value = normalizeWriteValue(writeState.tag.dataType, writeState.value)
  } catch (error) {
    writeState.error = error.message
    writeValueInput.value?.focus()
    return
  }
  writeState.busy = true
  try {
    await writeRealTag(writeState.tag.id, value)
    writeDialog.value?.close()
    tableMessage.value = `${writeState.tag.name} 写入成功，回读值一致。`
  } catch (error) {
    writeState.error = error instanceof Error ? error.message : '写入失败。'
  } finally {
    writeState.busy = false
  }
}

async function toggleWriteUnlock(event) {
  tableMessage.value = ''
  try {
    await setRealWriteUnlocked(event.target.checked)
    tableMessage.value = event.target.checked ? '实际写入已为本次连接解锁。' : '实际写入已重新锁定。'
  } catch (error) {
    event.target.checked = false
    tableMessage.value = error instanceof Error ? error.message : '无法更新实际写入联锁。'
  }
}

function displayValue(tag) {
  if (tag.value === null || tag.value === undefined) return '—'
  if (tag.dataType === 'BOOL') return tag.value ? 'TRUE' : 'FALSE'
  if (tag.dataType === 'TIME') return `${formatTimeValue(tag.value)} (${tag.value} ms)`
  return `${tag.value}${tag.unit ? ` ${tag.unit}` : ''}`
}
</script>

<template>
  <section class="full-view interaction-view" aria-labelledby="interaction-title">
    <header class="view-heading">
      <div>
        <p class="utility-label">INTERACTION / WATCH TABLE</p>
        <h1 id="interaction-title">变量监视与控制</h1>
        <p>{{ isReal ? '配置实际绝对地址，经过本地网关监控并安全写入。' : '监视模拟 I/O、写入设定值并观察过程趋势。' }}</p>
      </div>
      <StatusBadge :state="plc.connectionState" :label="connectionLabel" />
    </header>

    <div v-if="!isConnected" class="empty-state">
      <div class="empty-state-code" aria-hidden="true">OFFLINE</div>
      <div>
        <p class="utility-label">CONNECTION REQUIRED</p>
        <h2>先连接 PLC</h2>
        <p>模拟变量或实际变量监控只有在连接状态正常时才会启用。</p>
        <RouterLink class="button button-primary" to="/connection/status">前往连接页面</RouterLink>
      </div>
    </div>

    <template v-else>
      <div class="interaction-toolbar">
        <div><span>通道</span><strong>{{ isReal ? '实际 PLC' : '模拟器' }}</strong></div>
        <div><span>设备</span><strong>{{ plc.profile.series }}</strong></div>
        <div><span>CPU</span><strong :class="{ 'text-success': !isReal }">{{ plc.cpuMode }}</strong></div>
        <div><span>数据质量</span><strong>{{ plc.quality }}</strong></div>
      </div>

      <template v-if="!isReal">
        <div class="interaction-grid">
          <section class="watch-panel" aria-labelledby="watch-title">
            <div class="section-heading"><div><span class="utility-label">LIVE DATA / SIMULATION</span><h2 id="watch-title">模拟变量表</h2></div><span>{{ plc.tags.length }} 个变量</span></div>
            <div class="table-scroll" tabindex="0" aria-label="可横向滚动的模拟变量表">
              <table class="watch-table">
                <thead><tr><th>地址</th><th>变量名称</th><th>类型</th><th>当前值</th><th>操作</th></tr></thead>
                <tbody>
                  <tr v-for="tag in plc.tags" :key="tag.id">
                    <td class="mono">{{ tag.address }}</td><td><strong>{{ tag.name }}</strong><small>{{ tag.writable ? '可写' : '只读' }}</small></td><td class="mono">{{ tag.dataType }}</td>
                    <td class="value-cell mono">{{ displayValue(tag) }}</td>
                    <td>
                      <button v-if="tag.dataType === 'BOOL' && tag.writable && !tag.pulse" class="table-action" type="button" :aria-pressed="tag.value" @click="setSimulationTagValue(tag.id, !tag.value)">{{ tag.value ? '关闭' : '开启' }}</button>
                      <label v-else-if="tag.dataType === 'INT' && tag.writable" class="inline-number"><span class="sr-only">设置 {{ tag.name }}</span><input :value="tag.value" type="number" @change="updateSimulationNumeric(tag, $event)" /></label>
                      <button v-else-if="tag.pulse" class="table-action" type="button" @click="pulseSimulationTag(tag.id)">发送脉冲</button>
                      <span v-else class="read-only-label">只读</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section class="trend-panel" aria-labelledby="trend-title">
            <div class="section-heading"><div><span class="utility-label">PROCESS TREND</span><h2 id="trend-title">液位趋势</h2></div><strong class="trend-value mono">{{ levelValue }}%</strong></div>
            <div class="trend-chart"><svg viewBox="0 0 600 160" role="img" aria-label="模拟液位最近 24 个采样点趋势"><g class="chart-grid"><path d="M0 28H600M0 80H600M0 132H600"/><path d="M0 0V160M150 0V160M300 0V160M450 0V160M600 0V160"/></g><polyline class="trend-line" :points="trendPoints" /></svg><div class="chart-axis"><span>较早</span><span>实时</span></div></div>
            <p class="chart-note">趋势数据由前端模拟器按设置中的刷新周期生成。</p>
          </section>
        </div>
      </template>

      <template v-else>
        <section class="real-tag-station" aria-labelledby="real-tag-title">
          <div class="section-heading">
            <div><span class="utility-label">LOCAL WATCH CONFIGURATION</span><h2 id="real-tag-title">实际变量配置</h2></div>
            <span>{{ plc.monitoring ? 'MONITORING LOCKED' : 'EDIT MODE' }}</span>
          </div>

          <div class="tag-config-toolbar">
            <button class="button button-secondary" type="button" :disabled="plc.monitoring" @click="addTag">添加变量</button>
            <label class="button button-secondary file-button" :class="{ disabled: plc.monitoring }">
              导入 TIA CSV
              <input ref="csvInput" type="file" accept=".csv,text/csv,text/plain" :disabled="plc.monitoring" @change="importCsv" />
            </label>
            <p>支持 DB 偏移和 I/Q/M 绝对地址；优化 DB 与在线符号浏览不在本版本范围内。</p>
          </div>

          <div v-if="csvPreview.fileName" class="csv-preview" aria-live="polite">
            <div><strong>{{ csvPreview.fileName }}</strong><span>{{ csvPreview.valid.length }} 行可导入 · {{ csvPreview.invalid.length }} 行跳过</span></div>
            <ul v-if="csvPreview.invalid.length"><li v-for="item in csvPreview.invalid.slice(0, 5)" :key="`${item.row}-${item.message}`">第 {{ item.row }} 行：{{ item.message }}</li></ul>
            <div class="form-actions"><button class="button button-secondary" type="button" @click="clearCsvPreview">取消</button><button class="button button-primary" type="button" :disabled="!csvPreview.valid.length" @click="confirmCsvImport">确认导入</button></div>
          </div>

          <div v-if="!draftTags.length && !plc.monitoring" class="tag-config-empty"><strong>尚未配置实际变量</strong><p>逐行添加变量，或导入包含名称、数据类型和绝对地址的 TIA Portal CSV。</p></div>

          <div v-else-if="!plc.monitoring" class="table-scroll" tabindex="0" aria-label="实际变量配置表">
            <table class="tag-config-table">
              <thead><tr><th>名称</th><th>区域</th><th>DB</th><th>字节</th><th>位</th><th>类型</th><th>可写</th><th>单位 / 注释</th><th>地址 / 操作</th></tr></thead>
              <tbody>
                <tr v-for="(tag, index) in draftTags" :key="tag.id" :class="{ 'tag-row-invalid': !tagValidation.rows[index]?.valid }">
                  <td><input v-model.trim="tag.name" :aria-label="`第 ${index + 1} 行变量名称`" /></td>
                  <td><select v-model="tag.area" :aria-label="`第 ${index + 1} 行区域`"><option>DB</option><option>I</option><option>Q</option><option>M</option></select></td>
                  <td><input v-model.number="tag.dbNumber" type="number" min="1" :disabled="tag.area !== 'DB'" :aria-label="`第 ${index + 1} 行 DB 编号`" /></td>
                  <td><input v-model.number="tag.byteOffset" type="number" min="0" :aria-label="`第 ${index + 1} 行字节偏移`" /></td>
                  <td><input v-model.number="tag.bitOffset" type="number" min="0" max="7" :disabled="tag.dataType !== 'BOOL'" :aria-label="`第 ${index + 1} 行位偏移`" /></td>
                  <td><select v-model="tag.dataType" :aria-label="`第 ${index + 1} 行数据类型`"><option>BOOL</option><option>BYTE</option><option>INT</option><option>REAL</option><option>TIME</option></select></td>
                  <td><label class="compact-check"><input v-model="tag.writable" type="checkbox" :aria-label="`允许写入 ${tag.name || `第 ${index + 1} 行`}`" /><span>允许</span></label></td>
                  <td><input v-model.trim="tag.unit" placeholder="单位" :aria-label="`第 ${index + 1} 行单位`"/><input v-model.trim="tag.comment" placeholder="注释" :aria-label="`第 ${index + 1} 行注释`"/></td>
                  <td><code>{{ formatTagAddress(tag) }}</code><small v-if="!tagValidation.rows[index]?.valid">{{ Object.values(tagValidation.rows[index]?.errors || {})[0] }}</small><button class="row-delete" type="button" :aria-label="`删除 ${tag.name || `第 ${index + 1} 行`}`" @click="removeTag(index)">删除</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="monitoring-controls">
            <p aria-live="polite">{{ tableMessage }}</p>
            <button v-if="!plc.monitoring" class="button button-primary" type="button" :disabled="busy || !draftTags.length" @click="startMonitoring">{{ busy ? '正在启动…' : '开始监控' }}</button>
            <button v-else class="button button-secondary" type="button" :disabled="busy" @click="stopMonitoring">{{ busy ? '正在停止…' : '停止监控并编辑' }}</button>
          </div>
        </section>

        <section v-if="plc.monitoring" class="real-watch-panel" aria-labelledby="real-watch-title">
          <div class="write-interlock">
            <div><span class="utility-label">WRITE INTERLOCK</span><strong>实际写入默认锁定</strong><p>只在隔离测试 PLC 或确认安全的调试状态下解锁。</p></div>
            <label><input type="checkbox" :checked="plc.writeUnlocked" @change="toggleWriteUnlock" /><span>我已确认设备处于安全调试状态</span></label>
          </div>
          <div class="section-heading"><div><span class="utility-label">LIVE DATA / LOCAL GATEWAY</span><h2 id="real-watch-title">实际变量监控</h2></div><span>{{ plc.tags.length }} 个变量 · {{ plc.cycleTime || '—' }} ms</span></div>
          <div class="table-scroll" tabindex="0" aria-label="实际 PLC 变量监控表">
            <table class="watch-table real-watch-table">
              <thead><tr><th>地址</th><th>变量名称</th><th>类型</th><th>当前值</th><th>质量</th><th>安全写入</th></tr></thead>
              <tbody>
                <tr v-for="tag in plc.tags" :key="tag.id">
                  <td class="mono">{{ tag.address }}</td><td><strong>{{ tag.name }}</strong><small>{{ tag.comment || (tag.writable ? '可写变量' : '只读变量') }}</small></td><td class="mono">{{ tag.dataType }}</td>
                  <td class="value-cell mono">{{ displayValue(tag) }}</td><td><span class="tag-quality" :class="`quality-${tag.quality}`">{{ tag.quality || 'unknown' }}</span><small v-if="tag.error">{{ tag.error }}</small></td>
                  <td>
                    <span v-if="!tag.writable" class="read-only-label">只读</span>
                    <button v-else-if="tag.dataType === 'BOOL'" class="table-action" type="button" :disabled="!plc.writeUnlocked || tag.quality !== 'good'" @click="openWriteDialog(tag, !tag.value)">写入 {{ tag.value ? 'FALSE' : 'TRUE' }}</button>
                    <div v-else class="write-inline"><input v-model="proposedValues[tag.id]" :placeholder="tag.dataType === 'TIME' ? 'T#1S 或毫秒' : '新值'" :aria-label="`${tag.name} 新值`"/><button class="table-action" type="button" :disabled="!plc.writeUnlocked || tag.quality !== 'good'" @click="openWriteDialog(tag)">写入</button></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </template>

    <dialog ref="writeDialog" class="gateway-pair-dialog write-confirm-dialog">
      <form method="dialog" @submit.prevent="confirmWrite">
        <div class="dialog-safety-line danger">REAL PLC WRITE / CONFIRMATION</div>
        <div><p class="utility-label">WRITE INTERLOCK</p><h2>确认写入实际 PLC</h2><p>确认后网关会重新读取旧值；若旧值已经变化，本次写入会被拒绝。</p></div>
        <dl v-if="writeState.tag" class="write-preview-list"><div><dt>变量</dt><dd>{{ writeState.tag.name }}</dd></div><div><dt>地址</dt><dd class="mono">{{ writeState.tag.address }}</dd></div><div><dt>类型</dt><dd class="mono">{{ writeState.tag.dataType }}</dd></div><div><dt>当前快照</dt><dd class="mono">{{ displayValue(writeState.tag) }}</dd></div></dl>
        <label class="field"><span>准备写入的新值</span><input ref="writeValueInput" v-model="writeState.value" autocomplete="off" :readonly="writeState.tag?.dataType === 'BOOL'" :aria-invalid="Boolean(writeState.error)" aria-describedby="write-error"/><small id="write-error" class="field-error">{{ writeState.error }}</small></label>
        <div class="dialog-actions"><button class="button button-secondary" type="button" :disabled="writeState.busy" @click="writeDialog.close()">取消</button><button class="button button-danger" type="submit" :disabled="writeState.busy">{{ writeState.busy ? '正在写入并回读…' : '确认实际写入' }}</button></div>
      </form>
    </dialog>
  </section>
</template>
