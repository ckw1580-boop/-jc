<script setup>
import { updateUser } from '@netlify/identity'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useIdentity } from '../../composables/useIdentity'

const router = useRouter()
const { clearCallback, isAdmin, refreshUser } = useIdentity()
const form = reactive({ password: '', confirmation: '' })
const errorMessage = ref('')
const submitting = ref(false)

async function submit() {
  errorMessage.value = ''
  if (form.password.length < 10 || form.password !== form.confirmation) {
    errorMessage.value = form.password.length < 10 ? '新密码至少需要 10 个字符。' : '两次输入的密码不一致。'
    return
  }
  submitting.value = true
  try {
    await updateUser({ password: form.password })
    await refreshUser()
    clearCallback()
    await router.replace(isAdmin.value ? { name: 'admin-feedback' } : { name: 'admin-forbidden' })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '密码重置失败。'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="admin-auth-page"><section class="admin-auth-card" aria-labelledby="reset-title"><div class="admin-auth-heading"><p class="utility-label">PASSWORD RECOVERY</p><h1 id="reset-title">重置管理员密码</h1><p>设置一个至少 10 个字符的新密码。</p></div><form @submit.prevent="submit"><label class="field"><span>新密码</span><input v-model="form.password" type="password" minlength="10" autocomplete="new-password" required /></label><label class="field"><span>确认新密码</span><input v-model="form.confirmation" type="password" minlength="10" autocomplete="new-password" required /></label><p v-if="errorMessage" class="admin-message error" role="alert">{{ errorMessage }}</p><button class="button button-primary admin-submit" type="submit" :disabled="submitting">{{ submitting ? '正在保存…' : '保存新密码' }}</button></form></section></main>
</template>

