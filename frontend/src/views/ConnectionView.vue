<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import LocalTaskbar from '../components/LocalTaskbar.vue'
import PlcRack from '../components/PlcRack.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { usePlcSimulator } from '../composables/usePlcSimulator'

const tasks = [{ label: 'PLC 状态显示', to: '/connection/status' }]
const { simulator, connectionLabel, connect, cancelConnection, disconnect } = usePlcSimulator()
const errors = reactive({ ip: '', rack: '', slot: '' })
const ipInput = ref(null)
const rackInput = ref(null)
const slotInput = ref(null)

const isConnecting = computed(() => simulator.connectionState === 'connecting')
const isConnected = computed(() => simulator.connectionState === 'connected')

function validate() {
  errors.ip = ''
  errors.rack = ''
  errors.slot = ''

  const parts = simulator.profile.ip.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
    errors.ip = '请输入有效 IPv4 地址，例如 192.168.0.1。'
  }
  if (!Number.isInteger(Number(simulator.profile.rack)) || Number(simulator.profile.rack) < 0 || Number(simulator.profile.rack) > 7) {
    errors.rack = '机架编号必须是 0 至 7 的整数。'
  }
  if (!Number.isInteger(Number(simulator.profile.slot)) || Number(simulator.profile.slot) < 0 || Number(simulator.profile.slot) > 31) {
    errors.slot = '插槽编号必须是 0 至 31 的整数。'
  }

  return !errors.ip && !errors.rack && !errors.slot
}

async function submitConnection() {
  if (!validate()) {
    await nextTick()
    if (errors.ip) ipInput.value?.focus()
    else if (errors.rack) rackInput.value?.focus()
    else slotInput.value?.focus()
    return
  }
  connect()
}
</script>

<template>
  <div class="workspace-layout">
    <LocalTaskbar title="连接任务" :items="tasks" />

    <section class="view-panel connection-view" aria-labelledby="connection-title">
      <header class="view-heading connection-heading">
        <div>
          <p class="utility-label">CONNECTION / PLC STATUS</p>
          <h1 id="connection-title">PLC 状态显示</h1>
          <p>配置演示设备并复现可预测的连接结果。</p>
        </div>
        <StatusBadge :state="simulator.connectionState" :label="connectionLabel" />
      </header>

      <div class="connection-grid">
        <form class="connection-form" novalidate @submit.prevent="submitConnection">
          <div class="section-heading">
            <div><span class="utility-label">01 / PARAMETERS</span><h2>连接参数</h2></div>
            <span>仅本地模拟</span>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>PLC 系列</span>
              <select v-model="simulator.profile.series" name="series" autocomplete="off" :disabled="isConnecting || isConnected">
                <option>S7-1200</option>
                <option>S7-1500</option>
              </select>
            </label>
            <label class="field field-wide">
              <span>IP 地址</span>
              <input
                ref="ipInput"
                v-model.trim="simulator.profile.ip"
                name="ip-address"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                spellcheck="false"
                :aria-invalid="Boolean(errors.ip)"
                aria-describedby="ip-error"
                :disabled="isConnecting || isConnected"
              />
              <small id="ip-error" class="field-error">{{ errors.ip }}</small>
            </label>
            <label class="field">
              <span>机架</span>
              <input
                ref="rackInput"
                v-model.number="simulator.profile.rack"
                name="rack"
                type="number"
                inputmode="numeric"
                min="0"
                max="7"
                autocomplete="off"
                :aria-invalid="Boolean(errors.rack)"
                aria-describedby="rack-error"
                :disabled="isConnecting || isConnected"
              />
              <small id="rack-error" class="field-error">{{ errors.rack }}</small>
            </label>
            <label class="field">
              <span>插槽</span>
              <input
                ref="slotInput"
                v-model.number="simulator.profile.slot"
                name="slot"
                type="number"
                inputmode="numeric"
                min="0"
                max="31"
                autocomplete="off"
                :aria-invalid="Boolean(errors.slot)"
                aria-describedby="slot-error"
                :disabled="isConnecting || isConnected"
              />
              <small id="slot-error" class="field-error">{{ errors.slot }}</small>
            </label>
            <label class="field field-wide">
              <span>演示场景</span>
              <select v-model="simulator.profile.scenario" name="scenario" autocomplete="off" :disabled="isConnecting || isConnected">
                <option value="success">正常连接</option>
                <option value="timeout">连接超时</option>
                <option value="mismatch">组态不匹配</option>
              </select>
            </label>
          </div>

          <div class="form-actions">
            <button v-if="!isConnected && !isConnecting" class="button button-primary" type="submit">建立模拟连接</button>
            <button v-if="isConnecting" class="button button-secondary" type="button" @click="cancelConnection">取消连接</button>
            <button v-if="isConnected" class="button button-danger" type="button" @click="disconnect">断开连接</button>
          </div>
        </form>

        <section class="diagnostic-panel" aria-labelledby="diagnostic-title">
          <div class="section-heading">
            <div><span class="utility-label">02 / DIAGNOSTICS</span><h2 id="diagnostic-title">运行诊断</h2></div>
          </div>
          <dl class="diagnostic-list">
            <div><dt>连接状态</dt><dd>{{ connectionLabel }}</dd></div>
            <div><dt>CPU 模式</dt><dd class="mono">{{ simulator.cpuMode }}</dd></div>
            <div><dt>数据质量</dt><dd>{{ simulator.quality }}</dd></div>
            <div><dt>刷新周期</dt><dd class="mono">{{ simulator.cycleTime ? `${simulator.cycleTime} ms` : '—' }}</dd></div>
            <div><dt>机架 / 插槽</dt><dd class="mono">{{ simulator.profile.rack }} / {{ simulator.profile.slot }}</dd></div>
          </dl>
          <div class="diagnostic-message" :class="`message-${simulator.connectionState}`" aria-live="polite">
            <strong>{{ connectionLabel }}</strong>
            <p>{{ simulator.message }}</p>
            <RouterLink v-if="simulator.activeFault" :to="{ path: '/errors', query: { code: simulator.activeFault } }">
              查看 {{ simulator.activeFault }} 处理步骤
            </RouterLink>
          </div>
        </section>
      </div>

      <PlcRack :series="simulator.profile.series" :state="simulator.connectionState" />
    </section>
  </div>
</template>
