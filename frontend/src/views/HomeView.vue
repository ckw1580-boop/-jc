<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import LocalTaskbar from '../components/LocalTaskbar.vue'
import PlcRack from '../components/PlcRack.vue'

const props = defineProps({
  section: { type: String, default: 'guide' },
})

const tasks = [
  { label: '使用方法介绍', to: '/home/guide' },
  { label: '页面基础信息', to: '/home/info' },
]

const isGuide = computed(() => props.section === 'guide')
</script>

<template>
  <div class="workspace-layout">
    <LocalTaskbar title="首页任务" :items="tasks" />

    <section v-if="isGuide" class="view-panel home-guide" aria-labelledby="home-guide-title">
      <header class="view-heading">
        <div>
          <p class="utility-label">HOME / QUICK START</p>
          <h1 id="home-guide-title">从连接到诊断</h1>
          <p>先建立模拟连接，再监视变量和定位故障。所有操作只发生在当前浏览器中。</p>
        </div>
        <RouterLink class="button button-primary" to="/connection/status">开始连接</RouterLink>
      </header>

      <PlcRack series="S7-1500" state="connected" />

      <div class="guide-grid">
        <ol class="process-list" aria-label="使用流程">
          <li>
            <span>01</span>
            <div><h2>选择设备</h2><p>在连接页选择 S7-1200 或 S7-1500，并确认模拟网络参数。</p></div>
          </li>
          <li>
            <span>02</span>
            <div><h2>建立连接</h2><p>选择确定性演示场景，查看连接、超时或组态错误的完整反馈。</p></div>
          </li>
          <li>
            <span>03</span>
            <div><h2>监视与交互</h2><p>连接正常后观察变量质量、模拟 I/O、设定值和过程趋势。</p></div>
          </li>
          <li>
            <span>04</span>
            <div><h2>定位问题</h2><p>通过错误信息手册按系列、严重度和演示代码查找处理步骤。</p></div>
          </li>
        </ol>

        <aside class="operator-note" aria-labelledby="operator-note-title">
          <p class="utility-label">OPERATOR NOTE</p>
          <h2 id="operator-note-title">这是前端模拟器</h2>
          <p>页面不会向真实 PLC 发送命令。连接状态、变量和诊断条目均为演示数据。</p>
          <dl>
            <div><dt>支持系列</dt><dd>S7-1200 / S7-1500</dd></div>
            <div><dt>通信方式</dt><dd>浏览器本地模拟</dd></div>
            <div><dt>数据保存</dt><dd>仅保存界面设置</dd></div>
          </dl>
        </aside>
      </div>
    </section>

    <section v-else class="view-panel home-info" aria-labelledby="home-info-title">
      <header class="view-heading">
        <div>
          <p class="utility-label">HOME / BASIC INFORMATION</p>
          <h1 id="home-info-title">S7 系列基础信息</h1>
          <p>用工程定位理解两个系列，不展示未经核验的具体性能参数。</p>
        </div>
      </header>

      <div class="series-comparison">
        <article>
          <div class="series-index">1200</div>
          <div class="series-copy">
            <span class="series-kicker">COMPACT AUTOMATION</span>
            <h2>S7-1200</h2>
            <p>紧凑结构、灵活配置，适用于广泛的基础自动化和机器控制场景。</p>
            <ul>
              <li>集成 CPU、供电和 I/O 能力</li>
              <li>支持 PROFINET 与扩展通信模块</li>
              <li>适合空间受限的控制柜与单机设备</li>
            </ul>
          </div>
        </article>
        <article>
          <div class="series-index">1500</div>
          <div class="series-copy">
            <span class="series-kicker">HIGH-PERFORMANCE AUTOMATION</span>
            <h2>S7-1500</h2>
            <p>高性能、模块化和可扩展，面向复杂机器与工业过程控制。</p>
            <ul>
              <li>多性能等级 CPU 与丰富扩展模块</li>
              <li>集成运动控制和系统诊断能力</li>
              <li>适合复杂自动化结构与数字化连接</li>
            </ul>
          </div>
        </article>
      </div>

      <div class="source-note">
        <strong>资料边界</strong>
        <p>本页仅用于界面演示和系列定位。进行设备选型、组态或维护时，请以 Siemens 官方产品页和对应版本手册为准。</p>
      </div>
    </section>
  </div>
</template>
