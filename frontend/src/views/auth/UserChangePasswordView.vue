<script setup>
import { nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import UserAuthFrame from '../../components/UserAuthFrame.vue'
import { useUserSession } from '../../composables/useUserSession'
import { ApiError } from '../../services/api'

const route = useRoute()
const router = useRouter()
const { changePassword, mustChangePassword } = useUserSession()
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const errors = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const currentInput = ref(null)
const newInput = ref(null)
const confirmInput = ref(null)
const submitting = ref(false)
const errorMessage = ref('')

function validate() {
  errors.currentPassword = form.currentPassword ? '' : '请输入当前密码或临时密码。'
  errors.newPassword = form.newPassword.length >= 10 && form.newPassword.length <= 128 ? '' : '新密码长度须为 10–128 个字符。'
  if (form.currentPassword && form.currentPassword === form.newPassword) errors.newPassword = '新密码不能与当前密码相同。'
  errors.confirmPassword = !form.confirmPassword
    ? '请再次输入新密码。'
    : (form.confirmPassword === form.newPassword ? '' : '两次输入的新密码不一致。')
  return !Object.values(errors).some(Boolean)
}

async function focusFirstError() {
  await nextTick()
  if (errors.currentPassword) currentInput.value?.focus()
  else if (errors.newPassword) newInput.value?.focus()
  else if (errors.confirmPassword) confirmInput.value?.focus()
}

async function submit() {
  errorMessage.value = ''
  if (!validate()) return focusFirstError()
  submitting.value = true
  try {
    await changePassword(form.currentPassword, form.newPassword)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/home/guide'
    await router.replace(redirect)
  } catch (error) {
    if (error instanceof ApiError && error.fields) Object.assign(errors, error.fields)
    errorMessage.value = error instanceof Error ? error.message : '密码修改失败，请稍后重试。'
    await focusFirstError()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UserAuthFrame :interlock-state="submitting ? '正在更新凭据' : (mustChangePassword ? '必须更新密码' : '账号安全')" step="STEP 02 / CREDENTIAL">
    <div class="access-form-heading"><p class="utility-label">CREDENTIAL ROTATION</p><h2>{{ mustChangePassword ? '修改临时密码' : '修改密码' }}</h2><p>{{ mustChangePassword ? '管理员已重置凭据。完成改密后才能进入控制台。' : '更新密码会立即使其他旧会话失效。' }}</p></div>
    <form class="access-form" novalidate @submit.prevent="submit">
      <label class="field"><span>当前密码</span><input ref="currentInput" v-model="form.currentPassword" name="current-password" type="password" autocomplete="current-password" required :aria-invalid="Boolean(errors.currentPassword)" :aria-describedby="errors.currentPassword ? 'change-current-error' : undefined" @input="errors.currentPassword = ''" /><span v-if="errors.currentPassword" id="change-current-error" class="field-error">{{ errors.currentPassword }}</span></label>
      <label class="field"><span>新密码</span><input ref="newInput" v-model="form.newPassword" name="new-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required :aria-invalid="Boolean(errors.newPassword)" :aria-describedby="errors.newPassword ? 'change-new-error' : 'change-password-help'" @input="errors.newPassword = ''; errors.confirmPassword = ''" /><small id="change-password-help">10–128 个字符，修改后旧会话立即失效</small><span v-if="errors.newPassword" id="change-new-error" class="field-error">{{ errors.newPassword }}</span></label>
      <label class="field"><span>确认新密码</span><input ref="confirmInput" v-model="form.confirmPassword" name="confirm-new-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required :aria-invalid="Boolean(errors.confirmPassword)" :aria-describedby="errors.confirmPassword ? 'change-confirm-error' : undefined" @input="errors.confirmPassword = ''" /><span v-if="errors.confirmPassword" id="change-confirm-error" class="field-error">{{ errors.confirmPassword }}</span></label>
      <p v-if="errorMessage" class="auth-message error" role="alert">{{ errorMessage }}</p>
      <div class="access-actions"><button class="button button-primary" type="submit" :disabled="submitting">{{ submitting ? '正在保存…' : '保存新密码' }}</button><RouterLink v-if="!mustChangePassword" class="button button-secondary" to="/home/guide">取消</RouterLink></div>
    </form>
  </UserAuthFrame>
</template>
