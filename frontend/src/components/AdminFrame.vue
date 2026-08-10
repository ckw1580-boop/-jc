<script setup>
import { useRouter } from 'vue-router'

import logoMark from '../assets/s7-control-mark.png'
import { useIdentity } from '../composables/useIdentity'

const router = useRouter()
const { logout, user } = useIdentity()

async function signOut() {
  await logout()
  await router.replace({ name: 'admin-login' })
}
</script>

<template>
  <div class="admin-frame">
    <header class="admin-header">
      <RouterLink class="admin-brand" to="/admin/feedback" aria-label="S7 CONTROL 反馈管理首页">
        <img :src="logoMark" alt="" width="36" height="36" />
        <span><strong>S7 CONTROL</strong><small>NETLIFY FEEDBACK ADMIN</small></span>
      </RouterLink>
      <div class="admin-account">
        <span><small>当前管理员</small><strong>{{ user?.name || user?.email }}</strong></span>
        <RouterLink class="button button-secondary" to="/home/guide">返回前台</RouterLink>
        <button class="button button-secondary" type="button" @click="signOut">退出登录</button>
      </div>
    </header>
    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

