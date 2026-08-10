<script setup>
import { acceptInvite } from '@netlify/identity'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import logoMark from '../../assets/s7-control-mark.png'
import { useIdentity } from '../../composables/useIdentity'

const router = useRouter()
const { callbackResult, clearCallback, isAdmin, refreshUser } = useIdentity()
const token = computed(() => callbackResult.value?.type === 'invite' ? callbackResult.value.token : '')
const form = reactive({ password: '', confirmation: '' })
const errorMessage = ref('')
const submitting = ref(false)

async function submit() {
  errorMessage.value = ''
  if (!token.value) {
    errorMessage.value = '邀请链接无效或已经过期，请重新发送邀请。'
    return
  }
  if (form.password.length < 10) {
    errorMessage.value = '新密码至少需要 10 个字符。'
    return
  }
  if (form.password !== form.confirmation) {
    errorMessage.value = '两次输入的密码不一致。'
    return
  }
  submitting.value = true
  try {
    await acceptInvite(token.value, form.password)
    await refreshUser()
    clearCallback()
    await router.replace(isAdmin.value ? { name: 'admin-feedback' } : { name: 'admin-forbidden' })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '无法接受管理员邀请。'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="admin-auth-page">
    <section class="admin-auth-card" aria-labelledby="invite-title">
      <div class="admin-auth-brand"><img :src="logoMark" alt="" width="48" height="48" /><span><strong>S7 CONTROL</strong><small>ADMIN INVITATION</small></span></div>
      <div class="admin-auth-heading"><p class="utility-label">IDENTITY SETUP</p><h1 id="invite-title">设置管理员密码</h1><p>邀请验证完成后，此密码将替代旧 Django 管理员密码。</p></div>
      <form @submit.prevent="submit">
        <label class="field"><span>新密码</span><input v-model="form.password" type="password" minlength="10" autocomplete="new-password" required /></label>
        <label class="field"><span>确认新密码</span><input v-model="form.confirmation" type="password" minlength="10" autocomplete="new-password" required /></label>
        <p v-if="errorMessage" class="admin-message error" role="alert">{{ errorMessage }}</p>
        <button class="button button-primary admin-submit" type="submit" :disabled="submitting">{{ submitting ? '正在设置…' : '完成账户设置' }}</button>
      </form>
    </section>
  </main>
</template>

