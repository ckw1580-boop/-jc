import { createRouter, createWebHistory } from 'vue-router'

import ConnectionView from '../views/ConnectionView.vue'
import ErrorManualView from '../views/ErrorManualView.vue'
import FeedbackView from '../views/FeedbackView.vue'
import HelpView from '../views/HelpView.vue'
import HomeView from '../views/HomeView.vue'
import InteractionView from '../views/InteractionView.vue'
import SettingsView from '../views/SettingsView.vue'
import { initializeIdentity, useIdentity } from '../composables/useIdentity'

const routes = [
  { path: '/', redirect: '/home/guide' },
  { path: '/home', redirect: '/home/guide' },
  {
    path: '/home/guide',
    name: 'home-guide',
    component: HomeView,
    props: { section: 'guide' },
    meta: { title: '首页', description: '使用方法介绍' },
  },
  {
    path: '/home/info',
    name: 'home-info',
    component: HomeView,
    props: { section: 'info' },
    meta: { title: '首页', description: '页面基础信息' },
  },
  {
    path: '/connection/status',
    name: 'connection-status',
    component: ConnectionView,
    meta: { title: '连接', description: 'PLC 状态显示' },
  },
  {
    path: '/interaction',
    name: 'interaction',
    component: InteractionView,
    meta: { title: '交互界面', description: '模拟变量监视与控制' },
  },
  {
    path: '/errors',
    name: 'errors',
    component: ErrorManualView,
    meta: { title: '错误信息手册', description: '演示诊断信息检索' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: '设置', description: '外观与模拟参数' },
  },
  {
    path: '/help',
    name: 'help',
    component: HelpView,
    meta: { title: '帮助', description: '快速开始与使用说明' },
  },
  {
    path: '/feedback',
    name: 'feedback',
    component: FeedbackView,
    meta: { title: '问题反馈', description: '通过 Netlify 安全提交问题反馈' },
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../views/admin/AdminLoginView.vue'),
    meta: { title: '管理员登录', layout: 'admin' },
  },
  {
    path: '/admin/accept-invite',
    name: 'admin-accept-invite',
    component: () => import('../views/admin/AdminInviteView.vue'),
    meta: { title: '设置管理员密码', layout: 'admin' },
  },
  {
    path: '/admin/reset-password',
    name: 'admin-reset-password',
    component: () => import('../views/admin/AdminResetPasswordView.vue'),
    meta: { title: '重置管理员密码', layout: 'admin' },
  },
  {
    path: '/admin/forbidden',
    name: 'admin-forbidden',
    component: () => import('../views/admin/AdminForbiddenView.vue'),
    meta: { title: '无管理权限', layout: 'admin' },
  },
  {
    path: '/admin/feedback',
    name: 'admin-feedback',
    component: () => import('../views/admin/AdminFeedbackListView.vue'),
    meta: { title: '反馈管理', layout: 'admin', requiresAdmin: true },
  },
  {
    path: '/admin/feedback/:id',
    name: 'admin-feedback-detail',
    component: () => import('../views/admin/AdminFeedbackDetailView.vue'),
    meta: { title: '反馈详情', layout: 'admin', requiresAdmin: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/home/guide' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  await initializeIdentity()
  const { callbackResult, isAdmin, user } = useIdentity()

  if (callbackResult.value?.type === 'invite' && to.name !== 'admin-accept-invite') {
    return { name: 'admin-accept-invite' }
  }
  if (callbackResult.value?.type === 'recovery' && to.name !== 'admin-reset-password') {
    return { name: 'admin-reset-password' }
  }
  if (to.meta.requiresAdmin && !user.value) {
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !isAdmin.value) {
    return { name: 'admin-forbidden' }
  }
  if (to.name === 'admin-login' && isAdmin.value) {
    return { name: 'admin-feedback' }
  }
  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.title || '工业控制台'} · S7 CONTROL`
})

export default router
