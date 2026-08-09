<script setup>
import { ref } from 'vue'

import { useSettings } from '../composables/useSettings'

const { settings, resetSettings } = useSettings()
const resetPending = ref(false)
const announcement = ref('')

function confirmReset() {
  resetSettings()
  resetPending.value = false
  announcement.value = '设置已恢复默认值。'
  window.setTimeout(() => (announcement.value = ''), 3000)
}
</script>

<template>
  <section class="full-view settings-view" aria-labelledby="settings-title">
    <header class="view-heading">
      <div>
        <p class="utility-label">SYSTEM / PREFERENCES</p>
        <h1 id="settings-title">界面与模拟设置</h1>
        <p>调整显示方式和前端数据刷新节奏，修改会保存在当前浏览器。</p>
      </div>
    </header>

    <div class="settings-layout">
      <div class="settings-index" aria-hidden="true">
        <span>01</span><b>外观</b>
        <span>02</span><b>数据</b>
        <span>03</span><b>恢复</b>
      </div>

      <div class="settings-sections">
        <section aria-labelledby="appearance-title">
          <div class="settings-section-heading"><span>01</span><div><h2 id="appearance-title">外观</h2><p>选择适合工作环境的主题与信息密度。</p></div></div>
          <fieldset class="choice-group">
            <legend>界面主题</legend>
            <label :class="{ selected: settings.theme === 'light' }">
              <input v-model="settings.theme" type="radio" name="theme" value="light" autocomplete="off" />
              <span class="theme-preview preview-light" aria-hidden="true"><i></i><i></i><i></i></span>
              <span><strong>明亮工程界面</strong><small>适合办公室与高照度环境</small></span>
            </label>
            <label :class="{ selected: settings.theme === 'dark' }">
              <input v-model="settings.theme" type="radio" name="theme" value="dark" autocomplete="off" />
              <span class="theme-preview preview-dark" aria-hidden="true"><i></i><i></i><i></i></span>
              <span><strong>深色控制室</strong><small>降低暗光环境中的屏幕亮度</small></span>
            </label>
          </fieldset>

          <fieldset class="choice-group compact-choices">
            <legend>界面密度</legend>
            <label :class="{ selected: settings.density === 'comfortable' }">
              <input v-model="settings.density" type="radio" name="density" value="comfortable" autocomplete="off" />
              <span><strong>舒适</strong><small>更宽松的行距与控件间隔</small></span>
            </label>
            <label :class="{ selected: settings.density === 'compact' }">
              <input v-model="settings.density" type="radio" name="density" value="compact" autocomplete="off" />
              <span><strong>紧凑</strong><small>同一屏幕显示更多工程信息</small></span>
            </label>
          </fieldset>
        </section>

        <section aria-labelledby="data-title">
          <div class="settings-section-heading"><span>02</span><div><h2 id="data-title">模拟数据</h2><p>控制变量表和趋势图的更新频率。</p></div></div>
          <fieldset class="refresh-options">
            <legend>刷新周期</legend>
            <label v-for="interval in [500, 1000, 2000]" :key="interval" :class="{ selected: settings.refreshInterval === interval }">
              <input v-model.number="settings.refreshInterval" type="radio" name="refresh" :value="interval" autocomplete="off" />
              <strong class="mono">{{ interval }} ms</strong>
              <small>{{ interval === 500 ? '快速' : interval === 1000 ? '标准' : '节能' }}</small>
            </label>
          </fieldset>
        </section>

        <section aria-labelledby="reset-title">
          <div class="settings-section-heading"><span>03</span><div><h2 id="reset-title">恢复默认设置</h2><p>清除当前浏览器保存的主题、密度和刷新周期。</p></div></div>
          <div v-if="!resetPending" class="reset-row">
            <p>连接状态和变量数据不会保存，因此无需在此清除。</p>
            <button class="button button-secondary" type="button" @click="resetPending = true">恢复默认设置</button>
          </div>
          <div v-else class="reset-confirm" role="alert">
            <div><strong>确认恢复默认值？</strong><p>主题将切换为明亮，密度恢复舒适，刷新周期恢复为 1000 ms。</p></div>
            <div><button class="button button-danger" type="button" @click="confirmReset">确认恢复</button><button class="button button-ghost" type="button" @click="resetPending = false">取消</button></div>
          </div>
        </section>
      </div>
    </div>
    <div class="sr-only" aria-live="polite">{{ announcement }}</div>
  </section>
</template>
