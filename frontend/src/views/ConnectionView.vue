<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import LocalTaskbar from '../components/LocalTaskbar.vue'
import PlcRack from '../components/PlcRack.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { usePlcConnection } from '../composables/usePlcConnection'

const tasks = [{ label: 'PLC 状态显示', to: '/connection/status' }]
const { plc, connectionLabel, connectSimulation, connectReal, pairGateway, cancelConnection, disconnect } = usePlcConnection()
const errors = reactive({ ip: '', rack: '', slot: '' })
const ipInput = ref(null)
const rackInput = ref(null)
const slotInput = ref(null)
const pairDialog = ref(null)
const pairCodeInput = ref(null)
const pairCode = ref('')
const pairError = ref('')
const pairing = ref(false)

const isConnecting = computed(() => plc.connectionState === 'connecting')
const isConnected = computed(() => plc.connectionState === 'connected')

function validate() {
  errors.ip = ''
  errors.rack = ''
  errors.slot = ''
  const parts = plc.profile.ip.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
    errors.ip = '请输入有效 IPv4 地址，例如 192.168.0.1。'
  }
  if (!Number.isInteger(Number(plc.profile.rack)) || Number(plc.profile.rack) < 0 || Number(plc.profile.rack) > 7) {
    errors.rack = '机架编号必须是 0 至 7 的整数。'
  }
  if (!Number.isInteger(Number(plc.profile.slot)) || Number(plc.profile.slot) < 0 || Number(plc.profile.slot) > 31) {
    errors.slot = '插槽编号必须是 0 至 31 的整数。'
  }
  return !errors.ip && !errors.rack && !errors.slot
}

async function focusFirstError() {
  await nextTick()
  if (errors.ip) ipInput.value?.focus()
  else if (errors.rack) rackInput.value?.focus()
  else slotInput.value?.focus()
}

async function establishSimulation() {
  if (!validate()) return focusFirstError()
  connectSimulation()
}

async function establishReal() {
  if (!validate()) return focusFirstError()
  try {
    const result = await connectReal()
    if (result?.pairingRequired) {
      pairCode.value = ''
      pairError.value = ''
      pairDialog.value?.showModal()
      await nextTick()
      pairCodeInput.value?.focus()
    }
  } catch {
    // 具体故障已写入运行诊断区。
  }
}

async function submitPairing() {
  pairError.value = ''
  if (!/^\d{6}$/.test(pairCode.value)) {
    pairError.value = '请输入网关托盘中显示的六位数字。'
    pairCodeInput.value?.focus()
    return
  }
  pairing.value = true
  try {
    await pairGateway(pairCode.value)
    pairDialog.value?.close()
    await establishReal()
  } catch (error) {
    pairError.value = error instanceof Error ? error.message : '网关配对失败。'
  } finally {
    pairing.value = false
  }
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
          <p>选择模拟通道，或通过 Windows 本地网关访问同一局域网中的实际 PLC。</p>
        </div>
        <StatusBadge :state="plc.connectionState" :label="connectionLabel" />
      </header>

      <div class="connection-grid">
        <form class="connection-form" novalidate @submit.prevent="establishSimulation">
          <div class="section-heading">
            <div><span class="utility-label">01 / PARAMETERS</span><h2>连接参数</h2></div>
            <span>{{ plc.mode === 'real' ? 'LOCAL GATEWAY' : 'SIMULATOR' }}</span>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>PLC 系列</span>
              <select v-model="plc.profile.series" name="series" autocomplete="off" :disabled="isConnecting || isConnected">
                <option>S7-1200</option>
                <option>S7-1500</option>
              </select>
            </label>
            <label class="field field-wide">
              <span>IP 地址</span>
              <input ref="ipInput" v-model.trim="plc.profile.ip" name="ip-address" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" :aria-invalid="Boolean(errors.ip)" aria-describedby="ip-error" :disabled="isConnecting || isConnected" />
              <small id="ip-error" class="field-error">{{ errors.ip }}</small>
            </label>
            <label class="field">
              <span>机架</span>
              <input ref="rackInput" v-model.number="plc.profile.rack" name="rack" type="number" inputmode="numeric" min="0" max="7" autocomplete="off" :aria-invalid="Boolean(errors.rack)" aria-describedby="rack-error" :disabled="isConnecting || isConnected" />
              <small id="rack-error" class="field-error">{{ errors.rack }}</small>
            </label>
            <label class="field">
              <span>插槽</span>
              <input ref="slotInput" v-model.number="plc.profile.slot" name="slot" type="number" inputmode="numeric" min="0" max="31" autocomplete="off" :aria-invalid="Boolean(errors.slot)" aria-describedby="slot-error" :disabled="isConnecting || isConnected" />
              <small id="slot-error" class="field-error">{{ errors.slot }}</small>
            </label>
            <label class="field field-wide">
              <span>演示场景 <small>仅用于模拟连接</small></span>
              <select v-model="plc.profile.scenario" name="scenario" autocomplete="off" :disabled="isConnecting || isConnected">
                <option value="success">正常连接</option>
                <option value="timeout">连接超时</option>
                <option value="mismatch">组态不匹配</option>
              </select>
            </label>
          </div>

          <div v-if="!isConnected && !isConnecting" class="connection-channel-actions">
            <button class="button button-secondary" type="submit">
              <span>建立模拟连接</span><small>浏览器演示器</small>
            </button>
            <button class="button button-primary real-connect-button" type="button" @click="establishReal">
              <span>建立实际连接</span><small>Windows 网关 · TCP 102</small>
            </button>
          </div>
          <div v-else class="form-actions">
            <button v-if="isConnecting" class="button button-secondary" type="button" @click="cancelConnection">取消连接</button>
            <button v-if="isConnected" class="button button-danger" type="button" @click="disconnect">断开连接</button>
          </div>
          <p class="connection-safety-note"><strong>实际连接不会经过 Netlify。</strong> PLC 地址和变量值只在本机浏览器与 localhost 网关之间传输。</p>
        </form>

        <section class="diagnostic-panel" aria-labelledby="diagnostic-title">
          <div class="section-heading">
            <div><span class="utility-label">02 / DIAGNOSTICS</span><h2 id="diagnostic-title">运行诊断</h2></div>
            <span class="mode-chip" :class="`mode-${plc.mode}`">{{ plc.mode === 'real' ? '实际' : '模拟' }}</span>
          </div>
          <dl class="diagnostic-list">
            <div><dt>连接状态</dt><dd>{{ connectionLabel }}</dd></div>
            <div><dt>CPU 模式</dt><dd class="mono">{{ plc.cpuMode }}</dd></div>
            <div><dt>数据质量</dt><dd>{{ plc.quality }}</dd></div>
            <div><dt>刷新周期</dt><dd class="mono">{{ plc.cycleTime ? `${plc.cycleTime} ms` : '—' }}</dd></div>
            <div><dt>机架 / 插槽</dt><dd class="mono">{{ plc.profile.rack }} / {{ plc.profile.slot }}</dd></div>
            <div><dt>网关</dt><dd class="mono">{{ plc.mode === 'real' ? plc.gatewayStatus : 'NOT USED' }}</dd></div>
          </dl>
          <div class="diagnostic-message" :class="`message-${plc.connectionState}`" aria-live="polite">
            <strong>{{ connectionLabel }}</strong>
            <p>{{ plc.message }}</p>
            <RouterLink v-if="plc.activeFault" :to="{ path: '/errors', query: { code: plc.activeFault } }">查看 {{ plc.activeFault }} 处理步骤</RouterLink>
          </div>
          <p v-if="plc.activeFault?.startsWith('REAL-')" class="diagnostic-disclaimer">REAL-* 为本项目诊断码，并非 Siemens 官方诊断数据。</p>
        </section>
      </div>

      <PlcRack :series="plc.profile.series" :state="plc.connectionState" :mode="plc.mode" />
    </section>

    <dialog ref="pairDialog" class="gateway-pair-dialog" @close="pairError = ''">
      <form method="dialog" @submit.prevent="submitPairing">
        <div class="dialog-safety-line">LOCAL GATEWAY / PAIRING</div>
        <div>
          <p class="utility-label">WINDOWS LOCAL TRUST</p>
          <h2>配对本地 PLC 网关</h2>
          <p>打开 Windows 托盘中的 S7 CONTROL PLC GATEWAY，输入当前六位配对码。配对不会授予互联网访问 PLC 的权限。</p>
        </div>
        <label class="field">
          <span>六位配对码</span>
          <input ref="pairCodeInput" v-model.trim="pairCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" :aria-invalid="Boolean(pairError)" aria-describedby="pair-error" />
          <small id="pair-error" class="field-error">{{ pairError }}</small>
        </label>
        <div class="dialog-actions">
          <button class="button button-secondary" type="button" :disabled="pairing" @click="pairDialog.close()">取消</button>
          <button class="button button-primary" type="submit" :disabled="pairing">{{ pairing ? '正在配对…' : '配对并连接' }}</button>
        </div>
      </form>
    </dialog>
  </div>
</template>
