import { createRouter, createWebHistory } from 'vue-router'

import { initializeIdentity, useIdentity } from '../composables/useIdentity'
import { initializeUserSession, useUserSession } from '../composables/useUserSession'

const routes = [
  { path: '/', redirect: '/home/guide' },
  { path: '/home', redirect: '/home/guide' },
  { path: '/login', name: 'user-login', component: () => import('../views/auth/UserLoginView.vue'), meta: { title: '用户登录', layout: 'auth', guestOnly: true } },
  { path: '/register', name: 'user-register', component: () => import('../views/auth/UserRegisterView.vue'), meta: { title: '注册账号', layout: 'auth', guestOnly: true } },
  { path: '/account/change-password', name: 'user-change-password', component: () => import('../views/auth/UserChangePasswordView.vue'), meta: { title: '修改密码', layout: 'auth', requiresUser: true } },
  { path: '/home/guide', name: 'home-guide', component: () => import('../views/HomeView.vue'), props: { section: 'guide' }, meta: { title: '首页', description: '使用方法介绍', requiresUser: true } },
  { path: '/home/info', name: 'home-info', component: () => import('../views/HomeView.vue'), props: { section: 'info' }, meta: { title: '首页', description: '页面基础信息', requiresUser: true } },
  { path: '/home/updates', name: 'home-updates', component: () => import('../views/HomeView.vue'), props: { section: 'updates' }, meta: { title: '更新信息', description: '已解决问题与维护记录', requiresUser: true } },
  { path: '/connection/status', name: 'connection-status', component: () => import('../views/ConnectionView.vue'), meta: { title: '连接', description: 'PLC 状态显示', requiresUser: true } },
  { path: '/interaction', name: 'interaction', component: () => import('../views/InteractionView.vue'), meta: { title: '交互界面', description: '模拟变量监视与控制', requiresUser: true } },
  { path: '/errors', name: 'errors', component: () => import('../views/ErrorManualView.vue'), meta: { title: '错误信息手册', description: '演示诊断信息检索', requiresUser: true } },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { title: '设置', description: '外观与模拟参数', requiresUser: true } },
  { path: '/help', name: 'help', component: () => import('../views/HelpView.vue'), meta: { title: '帮助', description: '快速开始与使用说明', requiresUser: true } },
  { path: '/feedback', name: 'feedback', component: () => import('../views/FeedbackView.vue'), meta: { title: '问题反馈', description: '通过 Netlify 安全提交问题反馈', requiresUser: true } },
  { path: '/admin/login', name: 'admin-login', component: () => import('../views/admin/AdminLoginView.vue'), meta: { title: '管理员登录', layout: 'admin' } },
  { path: '/admin/accept-invite', name: 'admin-accept-invite', component: () => import('../views/admin/AdminInviteView.vue'), meta: { title: '设置管理员密码', layout: 'admin' } },
  { path: '/admin/reset-password', name: 'admin-reset-password', component: () => import('../views/admin/AdminResetPasswordView.vue'), meta: { title: '重置管理员密码', layout: 'admin' } },
  { path: '/admin/forbidden', name: 'admin-forbidden', component: () => import('../views/admin/AdminForbiddenView.vue'), meta: { title: '无管理权限', layout: 'admin' } },
  { path: '/admin/feedback', name: 'admin-feedback', component: () => import('../views/admin/AdminFeedbackListView.vue'), meta: { title: '反馈管理', layout: 'admin', requiresAdmin: true } },
  { path: '/admin/feedback/:id', name: 'admin-feedback-detail', component: () => import('../views/admin/AdminFeedbackDetailView.vue'), meta: { title: '反馈详情', layout: 'admin', requiresAdmin: true } },
  { path: '/admin/users', name: 'admin-users', component: () => import('../views/admin/AdminUserListView.vue'), meta: { title: '用户信息管理', layout: 'admin', requiresAdmin: true } },
  { path: '/admin/updates', name: 'admin-updates', component: () => import('../views/admin/AdminUpdateListView.vue'), meta: { title: '更新信息管理', layout: 'admin', requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', redirect: '/home/guide' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

function safeRedirect(value, fallback = '/home/guide') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}

router.beforeEach(async (to) => {
  const isAdminRoute = to.path.startsWith('/admin/')
  const hasIdentityCallback = /(?:invite_token|recovery_token|confirmation_token|access_token)=/.test(window.location.hash)

  if (isAdminRoute || hasIdentityCallback) {
    await initializeIdentity()
    const { callbackResult, isAdmin, user } = useIdentity()
    if (callbackResult.value?.type === 'invite' && to.name !== 'admin-accept-invite') return { name: 'admin-accept-invite' }
    if (callbackResult.value?.type === 'recovery' && to.name !== 'admin-reset-password') return { name: 'admin-reset-password' }
    if (to.meta.requiresAdmin && !user.value) return { name: 'admin-login', query: { redirect: to.fullPath } }
    if (to.meta.requiresAdmin && !isAdmin.value) return { name: 'admin-forbidden' }
    if (to.name === 'admin-login' && isAdmin.value) return { name: 'admin-feedback' }
    return true
  }

  await initializeUserSession()
  const { isAuthenticated, mustChangePassword } = useUserSession()
  if (to.meta.guestOnly && isAuthenticated.value) {
    if (mustChangePassword.value) return { name: 'user-change-password', query: { redirect: to.query.redirect } }
    return safeRedirect(to.query.redirect)
  }
  if (to.meta.requiresUser && !isAuthenticated.value) {
    return { name: 'user-login', query: { redirect: to.fullPath } }
  }
  if (isAuthenticated.value && mustChangePassword.value && to.name !== 'user-change-password') {
    return { name: 'user-change-password', query: { redirect: to.fullPath } }
  }
  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.title || '工业控制台'} · S7 CONTROL`
})

export default router
