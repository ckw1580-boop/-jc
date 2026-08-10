<script setup>
import { useRouter } from 'vue-router'

import { useIdentity } from '../../composables/useIdentity'

const router = useRouter()
const { logout, user } = useIdentity()

async function signOut() {
  await logout()
  await router.replace({ name: 'admin-login' })
}
</script>

<template>
  <main class="admin-auth-page"><section class="admin-auth-card"><div class="admin-auth-heading"><p class="utility-label">ACCESS / FORBIDDEN</p><h1>没有管理权限</h1><p>账号 {{ user?.email || '未知账号' }} 已登录，但未被授予 admin 角色。</p></div><button class="button button-primary admin-submit" type="button" @click="signOut">退出并更换账号</button><RouterLink class="admin-text-action" to="/home/guide">返回公开页面</RouterLink></section></main>
</template>

