<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AdminFrame from '../../components/AdminFrame.vue'
import { ApiError, apiRequest } from '../../services/api'

const route = useRoute()
const router = useRouter()
const feedback = ref(null)
const loading = ref(true)
const deleting = ref(false)
const errorMessage = ref('')

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'medium' }).format(new Date(value)) : '—'
}

function formatSize(bytes) {
  return `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`
}

async function load() {
  try {
    const result = await apiRequest(`/api/admin/feedback/${route.params.id}`)
    feedback.value = result.feedback
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '无法读取反馈详情。'
  } finally {
    loading.value = false
  }
}

async function removeFeedback() {
  if (!window.confirm('确定删除这条反馈及其全部图片附件吗？此操作无法撤销。')) return
  deleting.value = true
  errorMessage.value = ''
  try {
    await apiRequest(`/api/admin/feedback/${route.params.id}`, { method: 'DELETE' })
    await router.replace({ name: 'admin-feedback' })
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '删除反馈失败。'
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <AdminFrame>
    <section class="admin-page admin-detail-page" aria-labelledby="feedback-detail-title">
      <RouterLink class="admin-back-link" to="/admin/feedback">← 返回反馈列表</RouterLink>
      <p v-if="loading" class="admin-loading" role="status">正在读取反馈详情…</p>
      <p v-else-if="errorMessage && !feedback" class="admin-message error" role="alert">{{ errorMessage }}</p>
      <template v-else-if="feedback">
        <header class="admin-page-heading"><div><p class="utility-label">FEEDBACK / {{ feedback.id }}</p><h1 id="feedback-detail-title">{{ feedback.contact_name }} 的问题反馈</h1><p>提交时间：{{ formatDate(feedback.submitted_at) }}</p></div><button class="button admin-danger-button" type="button" :disabled="deleting" @click="removeFeedback">{{ deleting ? '正在删除…' : '删除反馈' }}</button></header>
        <p v-if="errorMessage" class="admin-message error" role="alert">{{ errorMessage }}</p>
        <div class="admin-detail-grid"><section class="admin-data-panel"><h2>联系信息</h2><dl><div><dt>联系人</dt><dd>{{ feedback.contact_name }}</dd></div><div><dt>联系电话</dt><dd class="mono">{{ feedback.contact_phone }}</dd></div><div><dt>本人邮箱</dt><dd><a :href="`mailto:${feedback.email}`">{{ feedback.email }}</a></dd></div></dl></section><section class="admin-data-panel admin-description-panel"><h2>问题描述</h2><p>{{ feedback.description }}</p></section></div>
        <section class="admin-data-panel admin-attachments"><div class="admin-section-heading"><h2>图片附件</h2><span>{{ feedback.image_attachments.length }} 张</span></div><p v-if="!feedback.image_attachments.length" class="admin-table-empty">此反馈没有图片附件。</p><ul v-else><li v-for="attachment in feedback.image_attachments" :key="attachment.id"><img :src="`/api/admin/feedback/${feedback.id}/attachments/${attachment.id}`" :alt="attachment.name" loading="lazy" /><div><strong>{{ attachment.name }}</strong><span>{{ attachment.contentType }} · {{ formatSize(attachment.size) }}</span></div><a class="button button-secondary" :href="`/api/admin/feedback/${feedback.id}/attachments/${attachment.id}?download=1`">下载</a></li></ul></section>
      </template>
    </section>
  </AdminFrame>
</template>
