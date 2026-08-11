<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AdminFrame from '../../components/AdminFrame.vue'
import { ApiError, apiRequest } from '../../services/api'

const route = useRoute()
const router = useRouter()
const state = reactive({ items: [], total: 0, page: 1, pageSize: 20 })
const query = ref(typeof route.query.query === 'string' ? route.query.query : '')
const loading = ref(true)
const errorMessage = ref('')
const notice = ref('')
const dialogRef = ref(null)
const titleInput = ref(null)
const summaryInput = ref(null)
const action = reactive({ mode: '', item: null, title: '', summary: '', errors: {}, submitting: false })
const totalPages = computed(() => Math.max(1, Math.ceil(state.total / state.pageSize)))

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}

async function load(page = state.page, syncUrl = true) {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = new URLSearchParams({ query: query.value.trim(), page: String(page), pageSize: String(state.pageSize) })
    const result = await apiRequest(`/api/admin/updates?${params}`)
    Object.assign(state, result)
    if (syncUrl) {
      const nextQuery = { page: String(result.page) }
      if (query.value.trim()) nextQuery.query = query.value.trim()
      await router.replace({ query: nextQuery })
    }
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '无法读取更新信息。'
  } finally {
    loading.value = false
  }
}

async function openAction(mode, item) {
  action.mode = mode
  action.item = item
  action.title = item.title
  action.summary = item.summary
  action.errors = {}
  dialogRef.value?.showModal()
  if (mode === 'edit') {
    await nextTick()
    titleInput.value?.focus()
  }
}

function closeAction() {
  if (!action.submitting) dialogRef.value?.close()
}

function validateEdit() {
  const errors = {}
  if (action.title.trim().length < 2 || action.title.trim().length > 100) errors.title = '公开标题请输入 2–100 个字符。'
  if (action.summary.trim().length < 10 || action.summary.trim().length > 1000) errors.summary = '解决说明请输入 10–1000 个字符。'
  action.errors = errors
  if (errors.title) titleInput.value?.focus()
  else if (errors.summary) summaryInput.value?.focus()
  return !Object.keys(errors).length
}

async function executeAction() {
  if (action.mode === 'edit' && !validateEdit()) return
  action.errors = {}
  action.submitting = true
  try {
    if (action.mode === 'edit') {
      await apiRequest(`/api/admin/updates/${action.item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: action.title.trim(), summary: action.summary.trim() }),
      })
      notice.value = '更新信息已修改。'
    } else {
      await apiRequest(`/api/admin/updates/${action.item.id}`, { method: 'DELETE' })
      notice.value = '更新信息已撤下。原反馈不会恢复。'
    }
    dialogRef.value?.close()
    await load(action.mode === 'retract' && state.items.length === 1 ? Math.max(1, state.page - 1) : state.page)
  } catch (error) {
    if (error instanceof ApiError) {
      action.errors = { ...(error.fields || {}), form: error.message }
    } else {
      action.errors = { form: '操作失败，请稍后重试。' }
    }
    await nextTick()
    if (action.errors.title) titleInput.value?.focus()
    else if (action.errors.summary) summaryInput.value?.focus()
  } finally {
    action.submitting = false
  }
}

async function resetSearch() { query.value = ''; await load(1) }

onMounted(() => {
  const page = Number.parseInt(typeof route.query.page === 'string' ? route.query.page : '1', 10)
  load(Number.isFinite(page) ? Math.max(1, page) : 1, false)
})
</script>

<template>
  <AdminFrame>
    <section class="admin-page" aria-labelledby="updates-admin-title">
      <header class="admin-page-heading"><div><p class="utility-label">DATABASE / FEEDBACK_UPDATES</p><h1 id="updates-admin-title">更新信息管理</h1><p>维护从已解决反馈发布的公开说明。这里只显示公开文案，不包含反馈者个人信息。</p></div><div class="admin-stat"><span>公开记录</span><strong>{{ state.total }}</strong></div></header>
      <form class="admin-toolbar" role="search" @submit.prevent="load(1)"><label><span class="sr-only">搜索公开标题或解决说明</span><input v-model="query" type="search" name="query" placeholder="搜索公开标题或解决说明…" autocomplete="off" /></label><button class="button button-primary" type="submit">搜索</button><button class="button button-secondary" type="button" @click="resetSearch">重置</button></form>
      <p v-if="notice" class="admin-message success" role="status">{{ notice }}</p>
      <p v-if="errorMessage" class="admin-message error" role="alert">{{ errorMessage }}</p>

      <div class="admin-table-wrap" :aria-busy="loading">
        <table class="admin-table updates-admin-table">
          <thead><tr><th>公开标题</th><th>解决说明</th><th>发布时间</th><th>最后修改</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="admin-table-empty">正在读取更新信息…</td></tr>
            <tr v-else-if="!state.items.length"><td colspan="5" class="admin-table-empty">没有符合条件的更新信息。</td></tr>
            <tr v-for="item in state.items" v-else :key="item.id"><td><strong>{{ item.title }}</strong><small class="table-record-id mono">{{ item.id }}</small></td><td><p class="admin-summary-cell">{{ item.summary }}</p></td><td>{{ formatDate(item.published_at) }}</td><td>{{ formatDate(item.updated_at) }}</td><td><div class="user-row-actions"><button class="admin-detail-link" type="button" @click="openAction('edit', item)">编辑</button><button class="admin-detail-link danger" type="button" @click="openAction('retract', item)">撤下</button></div></td></tr>
          </tbody>
        </table>
      </div>
      <nav class="admin-pagination" aria-label="更新信息列表分页"><button class="button button-secondary" type="button" :disabled="state.page <= 1 || loading" @click="load(state.page - 1)">上一页</button><span>第 {{ state.page }} / {{ totalPages }} 页</span><button class="button button-secondary" type="button" :disabled="state.page >= totalPages || loading" @click="load(state.page + 1)">下一页</button></nav>
    </section>

    <dialog ref="dialogRef" class="admin-action-dialog update-action-dialog" @cancel.prevent="closeAction">
      <form method="dialog" @submit.prevent="executeAction">
        <div class="dialog-safety-line" :class="{ danger: action.mode === 'retract' }"><span class="mono">UPDATE / {{ action.mode?.toUpperCase() }}</span></div>
        <h2>{{ action.mode === 'edit' ? '编辑公开更新' : '撤下更新信息' }}</h2>
        <template v-if="action.mode === 'edit'">
          <p>修改后，首页“更新信息”将立即显示新内容。</p>
          <label class="field"><span>公开标题</span><input ref="titleInput" v-model="action.title" name="update-title" type="text" minlength="2" maxlength="100" autocomplete="off" required :aria-invalid="Boolean(action.errors.title)" aria-describedby="update-title-error" /><small id="update-title-error" class="field-error">{{ action.errors.title }}</small></label>
          <label class="field"><span>解决说明</span><textarea ref="summaryInput" v-model="action.summary" name="update-summary" rows="7" minlength="10" maxlength="1000" autocomplete="off" required :aria-invalid="Boolean(action.errors.summary)" aria-describedby="update-summary-error"></textarea><small id="update-summary-error" class="field-error">{{ action.errors.summary }}</small></label>
        </template>
        <p v-else>确定撤下“<strong>{{ action.item?.title }}</strong>”吗？此操作永久删除公开更新，不会恢复原反馈。</p>
        <p v-if="action.errors.form" class="admin-message error" role="alert">{{ action.errors.form }}</p>
        <div class="dialog-actions"><button class="button button-secondary" type="button" :disabled="action.submitting" @click="closeAction">取消</button><button class="button" :class="action.mode === 'retract' ? 'button-danger' : 'button-primary'" type="submit" :disabled="action.submitting">{{ action.submitting ? '正在处理…' : action.mode === 'edit' ? '保存修改' : '确认撤下' }}</button></div>
      </form>
    </dialog>
  </AdminFrame>
</template>
