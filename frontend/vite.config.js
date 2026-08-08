import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/static/vue/' : '/',
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(new URL('../static/vue', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/admin': 'http://127.0.0.1:8000',
      '/api': 'http://127.0.0.1:8000',
      '/static': 'http://127.0.0.1:8000',
    },
  },
}))
