<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import logoMark from '../assets/s7-control-mark.png'
import { useSettings } from '../composables/useSettings'

const route = useRoute()
const { settings, toggleTheme } = useSettings()
const menuOpen = ref(false)

const navigation = [
  { label: '首页', to: '/home/guide', match: '/home' },
  { label: '连接', to: '/connection/status', match: '/connection' },
  { label: '交互界面', to: '/interaction', match: '/interaction' },
  { label: '错误信息手册', to: '/errors', match: '/errors' },
  { label: '设置', to: '/settings', match: '/settings' },
  { label: '帮助', to: '/help', match: '/help' },
  { label: '问题反馈', to: '/feedback', match: '/feedback' },
]

const themeActionLabel = computed(() =>
  settings.theme === 'light' ? '切换为深色主题' : '切换为明亮主题',
)

function isCurrent(item) {
  return route.path.startsWith(item.match)
}

function closeMenu() {
  menuOpen.value = false
}

function onKeydown(event) {
  if (event.key === 'Escape') closeMenu()
}

watch(
  () => route.fullPath,
  () => closeMenu(),
)

window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="app-header">
    <RouterLink class="brand" to="/home/guide" aria-label="S7 CONTROL 首页">
      <span class="brand-symbol" aria-hidden="true">
        <img :src="logoMark" alt="" />
      </span>
      <span class="brand-copy">
        <strong>S7 CONTROL</strong>
        <small>PLC 模拟工作站</small>
      </span>
    </RouterLink>

    <nav class="primary-nav" aria-label="主导航">
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :aria-current="isCurrent(item) ? 'page' : undefined"
        :class="{ active: isCurrent(item) }"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="header-actions">
      <span class="simulation-label"><i aria-hidden="true"></i>模拟模式</span>
      <button class="icon-button theme-toggle" type="button" :aria-label="themeActionLabel" @click="toggleTheme">
        <svg v-if="settings.theme === 'light'" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42M18.36 5.64l-1.42 1.42M7.06 16.94l-1.42 1.42M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />
        </svg>
      </button>
      <button
        class="icon-button menu-button"
        type="button"
        aria-label="打开主导航"
        :aria-expanded="menuOpen"
        aria-controls="mobile-navigation"
        @click="menuOpen = !menuOpen"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
    </div>
  </header>

  <button v-if="menuOpen" class="drawer-backdrop" type="button" aria-label="关闭主导航" @click="closeMenu"></button>
  <nav
    id="mobile-navigation"
    class="mobile-nav"
    :class="{ open: menuOpen }"
    aria-label="移动端主导航"
    :aria-hidden="!menuOpen"
    :inert="!menuOpen"
  >
    <div class="mobile-nav-heading">
      <span>页面导航</span>
      <button class="icon-button" type="button" aria-label="关闭主导航" @click="closeMenu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
    <RouterLink
      v-for="item in navigation"
      :key="item.to"
      :to="item.to"
      :aria-current="isCurrent(item) ? 'page' : undefined"
      :class="{ active: isCurrent(item) }"
    >
      <span>{{ item.label }}</span><span aria-hidden="true">→</span>
    </RouterLink>
  </nav>
</template>
