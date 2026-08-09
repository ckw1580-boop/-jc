<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  title: { type: String, required: true },
  items: { type: Array, required: true },
})
</script>

<template>
  <aside class="local-taskbar">
    <div class="taskbar-heading">
      <span class="utility-label">TASKS</span>
      <h2>{{ title }}</h2>
    </div>
    <nav aria-label="页面任务">
      <RouterLink v-for="item in items" :key="item.to" :to="item.to">
        <span>{{ item.label }}</span>
        <span aria-hidden="true">›</span>
      </RouterLink>
    </nav>
  </aside>
</template>
