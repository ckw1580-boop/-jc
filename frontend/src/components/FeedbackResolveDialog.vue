<script setup>
import { nextTick, reactive, ref } from 'vue'

import { ApiError, apiRequest } from '../services/api'

const emit = defineEmits(['resolved'])
const dialogRef = ref(null)
const titleInput = ref(null)
const summaryInput = ref(null)
const feedback = ref(null)
const form = reactive({ title: '', summary: '' })
const errors = reactive({ title: '', summary: '', form: '' })
const submitting = ref(false)

async function open(item) {
  feedback.value = item
  form.title = ''
  form.summary = ''
  errors.title = ''
  errors.summary = ''
  errors.form = ''
  dialogRef.value?.showModal()
  await nextTick()
  titleInput.value?.focus()
}

function close() {
  if (!submitting.value) dialogRef.value?.close()
}

function validate() {
  errors.title = form.title.trim().length >= 2 && form.title.trim().length <= 100
    ? ''
    : '公开标题请输入 2–100 个字符。'
  errors.summary = form.summary.trim().length >= 10 && form.summary.trim().length <= 1000
    ? ''
    : '解决说明请输入 10–1000 个字符。'
  if (errors.title) titleInput.value?.focus()
  else if (errors.summary) summaryInput.value?.focus()
  return !errors.title && !errors.summary
}

async function submit() {
  errors.form = ''
  if (!validate()) return

  submitting.value = true
  try {
    const result = await apiRequest(`/api/admin/feedback/${feedback.value.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.title.trim(), summary: form.summary.trim() }),
    })
    dialogRef.value?.close()
    emit('resolved', { feedbackId: feedback.value.id, update: result.update })
  } catch (error) {
    if (error instanceof ApiError) {
      errors.title = error.fields?.title || ''
      errors.summary = error.fields?.summary || ''
      errors.form = error.message
      await nextTick()
      if (errors.title) titleInput.value?.focus()
      else if (errors.summary) summaryInput.value?.focus()
    } else {
      errors.form = '无法发布更新信息，请稍后重试。'
    }
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialogRef" class="admin-action-dialog feedback-resolve-dialog" @cancel.prevent="close">
    <form method="dialog" @submit.prevent="submit">
      <div class="dialog-safety-line"><span class="mono">RESOLVE / PUBLISH UPDATE</span></div>
      <div>
        <h2>确认问题已经解决</h2>
        <p class="dialog-lead">反馈编号 <strong class="mono">{{ feedback?.id }}</strong></p>
        <p class="dialog-lead">联系人：<strong>{{ feedback?.contact_name }}</strong></p>
      </div>

      <p class="dialog-warning">确认后，原反馈及附件将永久删除；下方公开文案会保留在“更新信息”中。请勿填写联系人、电话、邮箱或其他个人信息。</p>

      <label class="field">
        <span>公开标题</span>
        <input ref="titleInput" v-model="form.title" name="update-title" type="text" minlength="2" maxlength="100" autocomplete="off" required :aria-invalid="Boolean(errors.title)" aria-describedby="resolve-title-help resolve-title-error" />
        <small id="resolve-title-help">用一句话说明已解决的问题，2–100 字。</small>
        <small id="resolve-title-error" class="field-error">{{ errors.title }}</small>
      </label>

      <label class="field">
        <span>解决说明</span>
        <textarea ref="summaryInput" v-model="form.summary" name="update-summary" rows="6" minlength="10" maxlength="1000" autocomplete="off" required :aria-invalid="Boolean(errors.summary)" aria-describedby="resolve-summary-help resolve-summary-error"></textarea>
        <small id="resolve-summary-help">说明修正内容和用户需要采取的操作，10–1000 字。</small>
        <small id="resolve-summary-error" class="field-error">{{ errors.summary }}</small>
      </label>

      <p v-if="errors.form" class="admin-message error" role="alert">{{ errors.form }}</p>
      <div class="dialog-actions">
        <button class="button button-secondary" type="button" :disabled="submitting" @click="close">取消</button>
        <button class="button button-primary" type="submit" :disabled="submitting">{{ submitting ? '正在发布…' : '确认解决并发布' }}</button>
      </div>
    </form>
  </dialog>
</template>
