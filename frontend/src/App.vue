<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppHeader from './components/AppHeader.vue'
import StatusBar from './components/StatusBar.vue'

const route = useRoute()
const isAdminLayout = computed(() => route.meta.layout === 'admin')
const pageTitle = computed(() => route.meta.title || '工业控制台')
const pageDescription = computed(() => route.meta.description || 'S7 系列 PLC 前端模拟工作站')
</script>

<template>
  <div v-if="isAdminLayout" class="admin-app-shell">
    <RouterView />
  </div>
  <template v-else>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <div class="app-shell">
    <AppHeader />

    <main id="main-content" class="app-main" tabindex="-1">
      <div class="page-context" aria-hidden="true">
        <span>{{ pageTitle }}</span>
        <span>{{ pageDescription }}</span>
      </div>
      <RouterView />
    </main>

    <StatusBar />
  </div>
  </template>
</template>
