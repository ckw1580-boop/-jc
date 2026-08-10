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
const dialogInput = ref(null)
const action = reactive({ mode: '', user: null, value: '', error: '', submitting: false })
const totalPages = computed(() => Math.max(1, Math.ceil(state.total / state.pageSize)))

const actionTitle = computed(() => ({
  disable: '禁用用户账号',
  enable: '启用用户账号',
  reset: '重置临时密码',
  delete: '永久删除用户',
})[action.mode] || '用户操作')

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}

async function load(page = state.page, syncUrl = true) {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = new URLSearchParams({ query: query.value.trim(), page: String(page), pageSize: String(state.pageSize) })
    const result = await apiRequest(`/api/admin/users?${params}`)
    Object.assign(state, result)
    if (syncUrl) {
      const nextQuery = { page: String(result.page) }
      if (query.value.trim()) nextQuery.query = query.value.trim()
      await router.replace({ query: nextQuery })
    }
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '无法读取用户信息。'
  } finally {
    loading.value = false
  }
}

async function search() { await load(1) }
async function resetSearch() { query.value = ''; await load(1) }

async function openAction(mode, user) {
  action.mode = mode
  action.user = user
  action.value = ''
  action.error = ''
  dialogRef.value?.showModal()
  await nextTick()
  if (['reset', 'delete'].includes(mode)) dialogInput.value?.focus()
}

function closeAction() {
  if (!action.submitting) dialogRef.value?.close()
}

async function executeAction() {
  action.error = ''
  if (action.mode === 'reset' && (action.value.length < 10 || action.value.length > 128)) {
    action.error = '临时密码长度须为 10–128 个字符。'
    return dialogInput.value?.focus()
  }
  if (action.mode === 'delete' && action.value.trim().toLowerCase() !== action.user.userId) {
    action.error = `请输入完整用户ID“${action.user.userId}”。`
    return dialogInput.value?.focus()
  }

  action.submitting = true
  try {
    if (['disable', 'enable'].includes(action.mode)) {
      await apiRequest(`/api/admin/users/${encodeURIComponent(action.user.userId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.mode === 'disable' ? 'disabled' : 'active' }),
      })
      notice.value = `用户 ${action.user.userId} 已${action.mode === 'disable' ? '禁用' : '启用'}。`
    } else if (action.mode === 'reset') {
      await apiRequest(`/api/admin/users/${encodeURIComponent(action.user.userId)}/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temporaryPassword: action.value }),
      })
      notice.value = `用户 ${action.user.userId} 的临时密码已更新；下次登录必须改密。`
    } else {
      await apiRequest(`/api/admin/users/${encodeURIComponent(action.user.userId)}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmUserId: action.value }),
      })
      notice.value = `用户 ${action.user.userId} 已永久删除。`
    }
    dialogRef.value?.close()
    await load(action.mode === 'delete' && state.items.length === 1 ? Math.max(1, state.page - 1) : state.page)
  } catch (error) {
    action.error = error instanceof ApiError ? error.message : '操作失败，请稍后重试。'
  } finally {
    action.submitting = false
  }
}

onMounted(() => {
  const page = Number.parseInt(typeof route.query.page === 'string' ? route.query.page : '1', 10)
  load(Number.isFinite(page) ? Math.max(1, page) : 1, false)
})
</script>

<template>
  <AdminFrame>
    <section class="admin-page" aria-labelledby="users-admin-title">
      <header class="admin-page-heading">
        <div><p class="utility-label">DATABASE / YONGHUDENGLUXINGXI</p><h1 id="users-admin-title">用户信息管理</h1><p>管理普通控制台用户。密码哈希不会出现在列表、详情或管理接口中。</p></div>
        <div class="admin-stat"><span>用户总数</span><strong>{{ state.total }}</strong></div>
      </header>

      <form class="admin-toolbar" role="search" @submit.prevent="search">
        <label><span class="sr-only">搜索用户ID或邮箱</span><input v-model="query" type="search" name="query" placeholder="搜索用户ID或邮箱" autocomplete="off" /></label>
        <button class="button button-primary" type="submit">搜索</button>
        <button class="button button-secondary" type="button" @click="resetSearch">重置</button>
      </form>
      <p v-if="notice" class="admin-message success" role="status">{{ notice }}</p>
      <p v-if="errorMessage" class="admin-message error" role="alert">{{ errorMessage }}</p>

      <div class="admin-table-wrap" :aria-busy="loading">
        <table class="admin-table user-admin-table">
          <thead><tr><th>用户ID</th><th>邮箱</th><th>账号状态</th><th>密码状态</th><th>注册时间</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>
            <tr v-if="loading"><td colspan="6" class="admin-table-empty">正在读取用户数据…</td></tr>
            <tr v-else-if="!state.items.length"><td colspan="6" class="admin-table-empty">没有符合条件的用户。</td></tr>
            <tr v-for="item in state.items" v-else :key="item.userId">
              <td><strong class="mono">{{ item.userId }}</strong></td><td>{{ item.email }}</td>
              <td><span class="account-status" :class="item.status"><i aria-hidden="true"></i>{{ item.status === 'active' ? '已启用' : '已禁用' }}</span></td>
              <td>{{ item.mustChangePassword ? '下次登录须改密' : '正常' }}</td><td>{{ formatDate(item.createdAt) }}</td>
              <td><div class="user-row-actions"><button class="admin-detail-link" type="button" @click="openAction(item.status === 'active' ? 'disable' : 'enable', item)">{{ item.status === 'active' ? '禁用' : '启用' }}</button><button class="admin-detail-link" type="button" @click="openAction('reset', item)">重置密码</button><button class="admin-detail-link danger" type="button" @click="openAction('delete', item)">删除</button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav class="admin-pagination" aria-label="用户列表分页"><button class="button button-secondary" type="button" :disabled="state.page <= 1 || loading" @click="load(state.page - 1)">上一页</button><span>第 {{ state.page }} / {{ totalPages }} 页</span><button class="button button-secondary" type="button" :disabled="state.page >= totalPages || loading" @click="load(state.page + 1)">下一页</button></nav>
    </section>

    <dialog ref="dialogRef" class="admin-action-dialog" @cancel.prevent="closeAction">
      <form method="dialog" @submit.prevent="executeAction">
        <div class="dialog-safety-line" :class="{ danger: action.mode === 'delete' }"><span class="mono">ACCOUNT / {{ action.mode?.toUpperCase() }}</span></div>
        <h2>{{ actionTitle }}</h2>
        <p v-if="action.mode === 'disable'">禁用 <strong class="mono">{{ action.user?.userId }}</strong> 后，其全部普通用户会话立即失效。</p>
        <p v-else-if="action.mode === 'enable'">启用 <strong class="mono">{{ action.user?.userId }}</strong>。重置密码不会自动启用账号。</p>
        <template v-else-if="action.mode === 'reset'"><p>设置临时密码后，旧会话立即失效，用户下次登录必须修改密码。</p><label class="field"><span>临时密码</span><input ref="dialogInput" v-model="action.value" name="temporary-password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required :aria-invalid="Boolean(action.error)" aria-describedby="admin-action-error" /></label></template>
        <template v-else-if="action.mode === 'delete'"><p>此操作不可恢复。请输入完整用户ID <strong class="mono">{{ action.user?.userId }}</strong> 确认。</p><label class="field"><span>确认用户ID</span><input ref="dialogInput" v-model="action.value" name="confirm-user-id" type="text" autocomplete="off" spellcheck="false" required :aria-invalid="Boolean(action.error)" aria-describedby="admin-action-error" /></label></template>
        <p v-if="action.error" id="admin-action-error" class="admin-message error" role="alert">{{ action.error }}</p>
        <div class="dialog-actions"><button class="button button-secondary" type="button" :disabled="action.submitting" @click="closeAction">取消</button><button class="button" :class="action.mode === 'delete' ? 'button-danger' : 'button-primary'" type="submit" :disabled="action.submitting">{{ action.submitting ? '正在处理…' : '确认操作' }}</button></div>
      </form>
    </dialog>
  </AdminFrame>
</template>
