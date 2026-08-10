<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import AdminFrame from '../../components/AdminFrame.vue'
import { ApiError, apiRequest } from '../../services/api'

const state = reactive({ items: [], total: 0, page: 1, pageSize: 20 })
const query = ref('')
const loading = ref(true)
const errorMessage = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(state.total / state.pageSize)))

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}

async function load(page = state.page) {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = new URLSearchParams({ query: query.value.trim(), page: String(page), pageSize: String(state.pageSize) })
    Object.assign(state, await apiRequest(`/api/admin/feedback?${params}`))
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '无法读取反馈列表。'
  } finally {
    loading.value = false
  }
}

onMounted(() => load(1))
</script>

<template>
  <AdminFrame>
    <section class="admin-page" aria-labelledby="feedback-admin-title">
      <header class="admin-page-heading"><div><p class="utility-label">DATABASE / SHUJUFANKUI</p><h1 id="feedback-admin-title">反馈管理</h1><p>查看联系人、问题描述和存放在 Netlify Blobs 中的图片附件。</p></div><div class="admin-stat"><span>已提交记录</span><strong>{{ state.total }}</strong></div></header>
      <form class="admin-toolbar" role="search" @submit.prevent="load(1)"><label><span class="sr-only">搜索联系人、电话或邮箱</span><input v-model="query" type="search" placeholder="搜索联系人、电话或邮箱" /></label><button class="button button-primary" type="submit">搜索</button><button class="button button-secondary" type="button" @click="query = ''; load(1)">重置</button></form>
      <p v-if="errorMessage" class="admin-message error" role="alert">{{ errorMessage }}</p>
      <div class="admin-table-wrap" :aria-busy="loading">
        <table class="admin-table"><thead><tr><th>联系人</th><th>联系电话</th><th>本人邮箱</th><th>图片</th><th>提交时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-if="loading"><td colspan="6" class="admin-table-empty">正在读取反馈数据…</td></tr><tr v-else-if="!state.items.length"><td colspan="6" class="admin-table-empty">没有符合条件的反馈记录。</td></tr><tr v-for="item in state.items" v-else :key="item.id"><td><strong>{{ item.contact_name }}</strong></td><td class="mono">{{ item.contact_phone }}</td><td>{{ item.email }}</td><td>{{ item.attachment_count }}</td><td>{{ formatDate(item.submitted_at) }}</td><td><RouterLink class="admin-detail-link" :to="`/admin/feedback/${item.id}`">查看详情 →</RouterLink></td></tr></tbody></table>
      </div>
      <nav class="admin-pagination" aria-label="反馈列表分页"><button class="button button-secondary" type="button" :disabled="state.page <= 1 || loading" @click="load(state.page - 1)">上一页</button><span>第 {{ state.page }} / {{ totalPages }} 页</span><button class="button button-secondary" type="button" :disabled="state.page >= totalPages || loading" @click="load(state.page + 1)">下一页</button></nav>
    </section>
  </AdminFrame>
</template>

