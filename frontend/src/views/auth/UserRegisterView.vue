<script setup>
import { nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import UserAuthFrame from '../../components/UserAuthFrame.vue'
import { useUserSession } from '../../composables/useUserSession'
import { ApiError } from '../../services/api'

const route = useRoute()
const router = useRouter()
const { register } = useUserSession()
const form = reactive({ userId: '', email: '', password: '', confirmPassword: '' })
const errors = reactive({ userId: '', email: '', password: '', confirmPassword: '' })
const userIdInput = ref(null)
const emailInput = ref(null)
const passwordInput = ref(null)
const confirmPasswordInput = ref(null)
const submitting = ref(false)
const errorMessage = ref('')

function validate() {
  errors.userId = /^[A-Za-z0-9_-]{4,32}$/.test(form.userId.trim()) ? '' : '用户ID须为 4–32 位字母、数字、下划线或短横线。'
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? '' : '请输入有效的邮箱地址。'
  errors.password = form.password.length >= 10 && form.password.length <= 128 ? '' : '密码长度须为 10–128 个字符。'
  errors.confirmPassword = !form.confirmPassword
    ? '请再次输入密码。'
    : (form.confirmPassword === form.password ? '' : '两次输入的密码不一致。')
  return !Object.values(errors).some(Boolean)
}

async function focusFirstError() {
  await nextTick()
  if (errors.userId) userIdInput.value?.focus()
  else if (errors.email) emailInput.value?.focus()
  else if (errors.password) passwordInput.value?.focus()
  else if (errors.confirmPassword) confirmPasswordInput.value?.focus()
}

async function submit() {
  errorMessage.value = ''
  if (!validate()) return focusFirstError()
  submitting.value = true
  try {
    await register(form.userId.trim(), form.email.trim(), form.password)
    await router.replace({ name: 'user-login', query: { registered: '1', redirect: route.query.redirect } })
  } catch (error) {
    if (error instanceof ApiError && error.fields) Object.assign(errors, error.fields)
    errorMessage.value = error instanceof Error ? error.message : '注册失败，请稍后重试。'
    await focusFirstError()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UserAuthFrame :interlock-state="submitting ? '正在建立账号' : '等待注册'" step="STEP 00 / ENROLL">
    <div class="access-form-heading"><p class="utility-label">OPERATOR ENROLLMENT</p><h2>注册账号</h2><p>建立普通用户身份。确认密码仅用于前端比对，不会发送或保存。</p></div>
    <form class="access-form" novalidate @submit.prevent="submit">
      <label class="field"><span>用户ID</span><input ref="userIdInput" v-model="form.userId" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="32" required :aria-invalid="Boolean(errors.userId)" :aria-describedby="errors.userId ? 'register-user-error' : undefined" @input="errors.userId = ''" /><span v-if="errors.userId" id="register-user-error" class="field-error">{{ errors.userId }}</span></label>
      <label class="field"><span>邮箱</span><input ref="emailInput" v-model="form.email" name="email" type="email" inputmode="email" autocomplete="email" spellcheck="false" maxlength="254" required :aria-invalid="Boolean(errors.email)" :aria-describedby="errors.email ? 'register-email-help register-email-error' : 'register-email-help'" @input="errors.email = ''" /><small id="register-email-help">邮箱可以使用“xx+@example.com”等非真实地址。请勿填写真实邮箱，避免网站发生安全事件时泄露个人信息。</small><span v-if="errors.email" id="register-email-error" class="field-error">{{ errors.email }}</span></label>
      <label class="field"><span>密码</span><input ref="passwordInput" v-model="form.password" name="new-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required :aria-invalid="Boolean(errors.password)" :aria-describedby="errors.password ? 'register-password-help register-password-error' : 'register-password-help'" @input="errors.password = ''; errors.confirmPassword = ''" /><small id="register-password-help">密码长度为 10–128 个字符。请勿使用已在其他网站或账号中使用的密码，避免网站发生安全事件时影响其他账号。</small><span v-if="errors.password" id="register-password-error" class="field-error">{{ errors.password }}</span></label>
      <label class="field"><span>确认密码</span><input ref="confirmPasswordInput" v-model="form.confirmPassword" name="confirm-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required :aria-invalid="Boolean(errors.confirmPassword)" :aria-describedby="errors.confirmPassword ? 'register-confirm-error' : undefined" @input="errors.confirmPassword = ''" /><span v-if="errors.confirmPassword" id="register-confirm-error" class="field-error">{{ errors.confirmPassword }}</span></label>
      <p v-if="errorMessage" class="auth-message error" role="alert">{{ errorMessage }}</p>
      <div class="access-actions"><button class="button button-primary" type="submit" :disabled="submitting">{{ submitting ? '正在注册…' : '注册' }}</button><RouterLink class="button button-secondary" :to="{ name: 'user-login', query: { redirect: route.query.redirect } }">返回登录</RouterLink></div>
    </form>
  </UserAuthFrame>
</template>
