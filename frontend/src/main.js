import { createApp } from 'vue'

import App from './App.vue'
import './styles.css'

if (window.location.pathname === '/' && window.location.hash.startsWith('#/')) {
  const legacyPath = window.location.hash.slice(1)
  window.history.replaceState(null, '', legacyPath)
}

const [{ default: router }, { initializeIdentity }] = await Promise.all([
  import('./router'),
  import('./composables/useIdentity'),
])

await initializeIdentity()
createApp(App).use(router).mount('#app')
