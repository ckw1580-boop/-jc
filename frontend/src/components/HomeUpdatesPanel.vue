<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ApiError, apiRequest } from '../services/api'

const route = useRoute()
const router = useRouter()
const state = reactive({ items: [], total: 0, page: 1, pageSize: 20 })
const loading = ref(true)
const errorMessage = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(state.total / state.pageSize)))

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : '—'
}

function wasEdited(item) {
  return new Date(item.updated_at).getTime() - new Date(item.published_at).getTime() > 1000
}

async function load(page = state.page) {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(state.pageSize) })
    Object.assign(state, await apiRequest(`/api/updates?${params}`))
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '无法读取更新信息。'
  } finally {
    loading.value = false
  }
}

function routePage(value) {
  const page = Number.parseInt(typeof value === 'string' ? value : '1', 10)
  return Number.isFinite(page) ? Math.max(1, page) : 1
}

async function goToPage(page) {
  await router.push({ query: page > 1 ? { page: String(page) } : {} })
}

watch(() => route.query.page, (value) => {
  const page = routePage(value)
  if (page !== state.page) load(page)
})

onMounted(() => load(routePage(route.query.page)))
</script>

<template>
  <section class="view-panel home-updates" aria-labelledby="home-updates-title">
    <header class="view-heading">
      <div><p class="utility-label">HOME / MAINTENANCE LOG</p><h1 id="home-updates-title">更新信息</h1><p>查看由已解决问题形成的公开维护记录。更新内容不包含反馈者的联系信息、原始描述或图片附件。</p></div>
      <RouterLink class="button button-secondary" to="/home/guide">返回使用介绍</RouterLink>
    </header>

    <p v-if="errorMessage" class="admin-message error" role="alert">{{ errorMessage }} <button class="inline-retry" type="button" @click="load(state.page)">重新加载</button></p>
    <div v-if="loading" class="updates-empty" role="status">正在读取维护记录…</div>
    <div v-else-if="!state.items.length" class="updates-empty"><span class="mono">LOG / EMPTY</span><h2>暂时没有更新信息</h2><p>管理员确认问题解决并发布说明后，记录会显示在这里。</p></div>
    <ol v-else class="maintenance-timeline" aria-label="更新信息时间线">
      <li v-for="(item, index) in state.items" :key="item.id">
        <div class="maintenance-index" aria-hidden="true"><span>{{ String((state.page - 1) * state.pageSize + index + 1).padStart(2, '0') }}</span><i></i></div>
        <article>
          <header><div><p class="utility-label">RESOLVED / {{ item.id.slice(0, 8).toUpperCase() }}</p><h2>{{ item.title }}</h2></div><time :datetime="item.published_at">{{ formatDate(item.published_at) }}</time></header>
          <p>{{ item.summary }}</p>
          <footer v-if="wasEdited(item)">最后修改：<time :datetime="item.updated_at">{{ formatDate(item.updated_at) }}</time></footer>
        </article>
      </li>
    </ol>
    <nav v-if="state.total > state.pageSize" class="admin-pagination updates-pagination" aria-label="更新信息分页"><button class="button button-secondary" type="button" :disabled="state.page <= 1 || loading" @click="goToPage(state.page - 1)">上一页</button><span>第 {{ state.page }} / {{ totalPages }} 页</span><button class="button button-secondary" type="button" :disabled="state.page >= totalPages || loading" @click="goToPage(state.page + 1)">下一页</button></nav>
  </section>
</template>
