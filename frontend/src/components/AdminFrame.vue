<script setup>
import { useRoute, useRouter } from 'vue-router'

import logoMark from '../assets/s7-control-mark.png'
import { useIdentity } from '../composables/useIdentity'

const route = useRoute()
const router = useRouter()
const { logout, user } = useIdentity()
const sections = [
  { label: '反馈管理', to: '/admin/feedback', match: '/admin/feedback' },
  { label: '更新信息管理', to: '/admin/updates', match: '/admin/updates' },
  { label: '用户信息管理', to: '/admin/users', match: '/admin/users' },
]
function isCurrent(item) { return route.path.startsWith(item.match) }
async function signOut() { await logout(); await router.replace({ name: 'admin-login' }) }
</script>

<template>
  <div class="admin-frame">
    <header class="admin-header">
      <RouterLink class="admin-brand" to="/admin/feedback" aria-label="S7 CONTROL 管理后台首页"><img :src="logoMark" alt="" width="36" height="36" /><span><strong>S7 CONTROL</strong><small>NETLIFY CONTROL ADMIN</small></span></RouterLink>
      <nav class="admin-section-nav" aria-label="后台管理分区"><RouterLink v-for="item in sections" :key="item.to" :to="item.to" :aria-current="isCurrent(item) ? 'page' : undefined" :class="{ active: isCurrent(item) }">{{ item.label }}</RouterLink></nav>
      <div class="admin-account"><span><small>当前管理员</small><strong>{{ user?.name || user?.email }}</strong></span><RouterLink class="button button-secondary" to="/home/guide">返回前台</RouterLink><button class="button button-secondary" type="button" @click="signOut">退出登录</button></div>
    </header>
    <main class="admin-main"><slot /></main>
  </div>
</template>
