<script setup>
import { computed } from 'vue'

import logoMark from '../assets/s7-control-mark.png'
import { useSettings } from '../composables/useSettings'

defineProps({
  interlockState: { type: String, default: '待验证' },
  step: { type: String, required: true },
})

const { settings, toggleTheme } = useSettings()
const themeLabel = computed(() => settings.theme === 'light' ? '切换为深色主题' : '切换为明亮主题')
</script>

<template>
  <main id="main-content" class="user-auth-page">
    <section class="access-interlock" aria-label="S7 CONTROL 用户访问认证">
      <header class="access-brand-row">
        <RouterLink class="access-brand" to="/login" aria-label="S7 CONTROL 用户登录">
          <img :src="logoMark" alt="" width="46" height="46" />
          <span><strong>S7 CONTROL</strong><small>INDUSTRIAL ACCESS</small></span>
        </RouterLink>
        <button class="icon-button" type="button" :aria-label="themeLabel" @click="toggleTheme">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" /></svg>
        </button>
      </header>

      <div class="access-layout">
        <aside class="access-schematic" aria-labelledby="access-system-title">
          <div>
            <p class="utility-label">ACCESS INTERLOCK / 01</p>
            <h1 id="access-system-title">建立可信操作会话</h1>
            <p>验证操作员身份后，控制台才会释放页面访问权限。管理员入口保持独立，不与普通用户账号混用。</p>
          </div>
          <div class="interlock-rail" aria-hidden="true">
            <span class="rail-terminal">24V</span>
            <span class="rail-wire active"></span>
            <span class="rail-contact"><i></i><i></i></span>
            <span class="rail-wire"></span>
            <span class="rail-module"><b>CPU</b><i></i><i></i><i></i></span>
            <span class="rail-wire"></span>
            <span class="rail-terminal">M</span>
          </div>
          <dl class="access-specs">
            <div><dt>会话时长</dt><dd class="mono">7 DAYS</dd></div>
            <div><dt>传输边界</dt><dd class="mono">HTTPS</dd></div>
            <div><dt>密码存储</dt><dd class="mono">SCRYPT</dd></div>
          </dl>
        </aside>

        <section class="access-form-station">
          <div class="interlock-status" aria-live="polite">
            <span><i aria-hidden="true"></i>访问联锁</span>
            <strong :key="interlockState">{{ interlockState }}</strong>
          </div>
          <div class="access-step mono">{{ step }}</div>
          <slot />
        </section>
      </div>
    </section>
  </main>
</template>
