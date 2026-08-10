import { createApp } from 'vue'

import App from './App.vue'
import './styles.css'

if (window.location.pathname === '/' && window.location.hash.startsWith('#/')) {
  const legacyPath = window.location.hash.slice(1)
  window.history.replaceState(null, '', legacyPath)
}

const { default: router } = await import('./router')
createApp(App).use(router).mount('#app')
