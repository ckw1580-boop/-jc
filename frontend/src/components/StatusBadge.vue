<script setup>
defineProps({
  state: { type: String, required: true },
  label: { type: String, required: true },
})
</script>

<template>
  <span class="status-badge" :class="`status-${state}`">
    <i aria-hidden="true"></i>
    {{ label }}
  </span>
</template>
