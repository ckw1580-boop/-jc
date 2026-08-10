import {
  getUser,
  handleAuthCallback,
  login as identityLogin,
  logout as identityLogout,
  onAuthChange,
} from '@netlify/identity'
import { computed, readonly, ref } from 'vue'

const user = ref(null)
const loading = ref(true)
const callbackResult = ref(null)
const initializationError = ref('')
let initialization
let unsubscribe

export function hasAdminRole(currentUser) {
  if (!currentUser) return false

  const roleSources = [
    currentUser.roles,
    currentUser.appMetadata?.roles,
    currentUser.app_metadata?.roles,
  ]

  return currentUser.role === 'admin'
    || roleSources.some((roles) => Array.isArray(roles) && roles.includes('admin'))
}

export function initializeIdentity() {
  if (initialization) return initialization
  initialization = (async () => {
    try {
      callbackResult.value = await handleAuthCallback()
      user.value = callbackResult.value?.user || await getUser()
      unsubscribe ||= onAuthChange((_event, currentUser) => {
        user.value = currentUser
      })
    } catch (error) {
      initializationError.value = error instanceof Error ? error.message : '身份服务初始化失败。'
      user.value = await getUser()
    } finally {
      loading.value = false
    }
  })()
  return initialization
}

export function useIdentity() {
  const isAdmin = computed(() => hasAdminRole(user.value))

  async function login(email, password) {
    const currentUser = await identityLogin(email, password)
    user.value = currentUser
    return currentUser
  }

  async function logout() {
    await identityLogout()
    user.value = null
  }

  async function refreshUser() {
    user.value = await getUser()
    return user.value
  }

  function clearCallback() {
    callbackResult.value = null
  }

  return {
    callbackResult: readonly(callbackResult),
    clearCallback,
    initializationError: readonly(initializationError),
    isAdmin,
    loading: readonly(loading),
    login,
    logout,
    refreshUser,
    user: readonly(user),
  }
}
