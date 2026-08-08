<script setup>
import { computed, onMounted, ref } from 'vue'

const apiState = ref('connecting')

const statusLabel = computed(() => {
  if (apiState.value === 'online') return '连接正常'
  if (apiState.value === 'offline') return '等待连接'
  return '正在检测'
})

onMounted(async () => {
  try {
    const response = await fetch('/api/health/')
    if (!response.ok) throw new Error('API unavailable')
    const data = await response.json()
    apiState.value = data.status === 'ok' ? 'online' : 'offline'
  } catch {
    apiState.value = 'offline'
  }
})
</script>

<template>
  <main class="page-shell">
    <nav class="topbar" aria-label="主导航">
      <a class="brand" href="/" aria-label="返回首页">
        <span class="brand-mark">D/V</span>
        <span>项目启动台</span>
      </a>
      <a class="admin-link" href="/admin/">进入管理后台 <span aria-hidden="true">↗</span></a>
    </nav>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">DJANGO × VUE</p>
        <h1 id="hero-title">前台，现已由<br /><em>Vue</em> 接管。</h1>
        <p class="summary">
          Django 专注数据、权限和接口，Vue 负责每一次屏幕交互。清晰的边界，让接下来的功能更容易生长。
        </p>
        <div class="actions">
          <a class="primary-action" href="/admin/">打开后台</a>
          <a class="text-action" href="https://cn.vuejs.org/" target="_blank" rel="noreferrer">查看 Vue 文档</a>
        </div>
      </div>

      <aside class="system-card" aria-label="系统连接状态">
        <div class="card-heading">
          <span>运行链路</span>
          <span class="status" :class="apiState">
            <i aria-hidden="true"></i>{{ statusLabel }}
          </span>
        </div>

        <div class="data-track" aria-hidden="true">
          <span class="track-node">VUE</span>
          <span class="track-line"><i></i></span>
          <span class="track-node">API</span>
          <span class="track-line"><i></i></span>
          <span class="track-node">DB</span>
        </div>

        <dl class="system-facts">
          <div><dt>界面层</dt><dd>Vue 3 + Vite</dd></div>
          <div><dt>服务层</dt><dd>Django 6.1</dd></div>
          <div><dt>后台</dt><dd>SimpleUI</dd></div>
        </dl>
      </aside>
    </section>

    <footer>
      <span>前后端分层已就绪</span>
      <span class="footer-rule" aria-hidden="true"></span>
      <span>{{ new Date().getFullYear() }}</span>
    </footer>
  </main>
</template>
