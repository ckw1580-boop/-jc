<script setup>
import { requestPasswordRecovery } from '@netlify/identity'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import logoMark from '../../assets/s7-control-mark.png'
import { useIdentity } from '../../composables/useIdentity'

const route = useRoute()
const router = useRouter()
const { initializationError, isAdmin, login } = useIdentity()
const form = reactive({ email: '', password: '' })
const errorMessage = ref(initializationError.value)
const notice = ref('')
const submitting = ref(false)

async function submit() {
  errorMessage.value = ''
  notice.value = ''
  submitting.value = true
  try {
    await login(form.email.trim(), form.password)
    if (!isAdmin.value) {
      await router.replace({ name: 'admin-forbidden' })
      return
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/feedback'
    await router.replace(redirect)
  } catch (error) {
    errorMessage.value = error?.status === 401
      ? '邮箱或密码不正确。'
      : (error instanceof Error ? error.message : '登录失败，请稍后重试。')
  } finally {
    submitting.value = false
  }
}

async function recover() {
  errorMessage.value = ''
  notice.value = ''
  const email = form.email.trim()
  if (!email) {
    errorMessage.value = '请先填写管理员邮箱。'
    return
  }
  try {
    await requestPasswordRecovery(email)
    notice.value = '密码重置邮件已发送，请检查邮箱。'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '无法发送重置邮件。'
  }
}
</script>

<template>
  <main class="admin-auth-page">
    <section class="admin-auth-card" aria-labelledby="admin-login-title">
      <RouterLink class="admin-auth-brand" to="/home/guide">
        <img :src="logoMark" alt="" width="48" height="48" />
        <span><strong>S7 CONTROL</strong><small>NETLIFY ADMIN</small></span>
      </RouterLink>
      <div class="admin-auth-heading">
        <p class="utility-label">IDENTITY / INVITE ONLY</p>
        <h1 id="admin-login-title">管理员登录</h1>
        <p>使用 Netlify Identity 邀请邮箱和新设置的密码登录。</p>
      </div>
      <form @submit.prevent="submit">
        <label class="field">
          <span>管理员邮箱</span>
          <input v-model="form.email" type="email" autocomplete="username" required />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="form.password" type="password" autocomplete="current-password" required />
        </label>
        <p v-if="errorMessage" class="admin-message error" role="alert">{{ errorMessage }}</p>
        <p v-if="notice" class="admin-message success" role="status">{{ notice }}</p>
        <button class="button button-primary admin-submit" type="submit" :disabled="submitting">
          {{ submitting ? '正在登录…' : '登录反馈管理' }}
        </button>
        <button class="admin-text-action" type="button" @click="recover">忘记密码</button>
      </form>
    </section>
  </main>
</template>

