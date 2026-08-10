import { computed, readonly, ref } from 'vue'

import { ApiError, apiRequest } from '../services/api'

const user = ref(null)
const mustChangePassword = ref(false)
const loading = ref(true)
const initializationError = ref('')
let initialization

export function initializeUserSession() {
  if (initialization) return initialization
  initialization = (async () => {
    try {
      const result = await apiRequest('/api/auth/session')
      user.value = result.user
      mustChangePassword.value = Boolean(result.mustChangePassword)
    } catch (error) {
      user.value = null
      mustChangePassword.value = false
      if (!(error instanceof ApiError) || error.status !== 401) {
        initializationError.value = error instanceof Error ? error.message : '无法检查登录状态。'
      }
    } finally {
      loading.value = false
    }
  })()
  return initialization
}

export function useUserSession() {
  async function login(userId, password) {
    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    })
    user.value = result.user
    mustChangePassword.value = Boolean(result.mustChangePassword)
    initializationError.value = ''
    return result
  }

  function register(userId, email, password) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, password }),
    })
  }

  async function logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
      mustChangePassword.value = false
    }
  }

  async function changePassword(currentPassword, newPassword) {
    const result = await apiRequest('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    user.value = result.user
    mustChangePassword.value = false
    return result
  }

  return {
    changePassword,
    initializationError: readonly(initializationError),
    isAuthenticated: computed(() => Boolean(user.value)),
    loading: readonly(loading),
    login,
    logout,
    mustChangePassword: readonly(mustChangePassword),
    register,
    user: readonly(user),
  }
}
