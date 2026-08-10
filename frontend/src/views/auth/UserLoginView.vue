<script setup>
import { nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import UserAuthFrame from '../../components/UserAuthFrame.vue'
import { useUserSession } from '../../composables/useUserSession'
import { ApiError } from '../../services/api'

const route = useRoute()
const router = useRouter()
const { login } = useUserSession()
const form = reactive({ userId: '', password: '' })
const errors = reactive({ userId: '', password: '' })
const userIdInput = ref(null)
const passwordInput = ref(null)
const submitting = ref(false)
const errorMessage = ref('')

function validate() {
  errors.userId = /^[A-Za-z0-9_-]{4,32}$/.test(form.userId.trim()) ? '' : '请输入 4–32 位有效用户ID。'
  errors.password = form.password ? '' : '请输入密码。'
  return !errors.userId && !errors.password
}

async function focusFirstError() {
  await nextTick()
  if (errors.userId) userIdInput.value?.focus()
  else if (errors.password) passwordInput.value?.focus()
}

async function submit() {
  errorMessage.value = ''
  if (!validate()) return focusFirstError()
  submitting.value = true
  try {
    const result = await login(form.userId.trim(), form.password)
    if (result.mustChangePassword) {
      await router.replace({ name: 'user-change-password', query: { redirect: route.query.redirect } })
      return
    }
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/home/guide'
    await router.replace(redirect)
  } catch (error) {
    if (error instanceof ApiError && error.fields) Object.assign(errors, error.fields)
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试。'
    await focusFirstError()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UserAuthFrame :interlock-state="submitting ? '正在校验' : '等待身份验证'" step="STEP 01 / SIGN IN">
    <div class="access-form-heading">
      <p class="utility-label">OPERATOR AUTHENTICATION</p>
      <h2>用户登录</h2>
      <p>输入已注册的用户ID与密码，解除控制台访问联锁。</p>
    </div>
    <p v-if="route.query.registered === '1'" class="auth-message success" role="status">注册成功，请使用新账号登录。</p>
    <form class="access-form" novalidate @submit.prevent="submit">
      <label class="field">
        <span>用户ID</span>
        <input ref="userIdInput" v-model="form.userId" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="32" required :aria-invalid="Boolean(errors.userId)" :aria-describedby="errors.userId ? 'login-user-error' : 'login-user-help'" @input="errors.userId = ''" />
        <small id="login-user-help">4–32 位字母、数字、下划线或短横线</small>
        <span v-if="errors.userId" id="login-user-error" class="field-error">{{ errors.userId }}</span>
      </label>
      <label class="field">
        <span>密码</span>
        <input ref="passwordInput" v-model="form.password" name="password" type="password" autocomplete="current-password" required :aria-invalid="Boolean(errors.password)" :aria-describedby="errors.password ? 'login-password-error' : undefined" @input="errors.password = ''" />
        <span v-if="errors.password" id="login-password-error" class="field-error">{{ errors.password }}</span>
      </label>
      <p v-if="errorMessage" class="auth-message error" role="alert">{{ errorMessage }}</p>
      <div class="access-actions">
        <button class="button button-primary" type="submit" :disabled="submitting">{{ submitting ? '正在登录…' : '登录' }}</button>
        <RouterLink class="button button-secondary" :to="{ name: 'user-register', query: { redirect: route.query.redirect } }">注册</RouterLink>
      </div>
    </form>
    <RouterLink class="admin-access-link" to="/admin/login">管理员入口 <span aria-hidden="true">→</span></RouterLink>
  </UserAuthFrame>
</template>
