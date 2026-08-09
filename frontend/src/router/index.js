import { createRouter, createWebHashHistory } from 'vue-router'

import ConnectionView from '../views/ConnectionView.vue'
import ErrorManualView from '../views/ErrorManualView.vue'
import FeedbackView from '../views/FeedbackView.vue'
import HelpView from '../views/HelpView.vue'
import HomeView from '../views/HomeView.vue'
import InteractionView from '../views/InteractionView.vue'
import SettingsView from '../views/SettingsView.vue'

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
    meta: { title: '问题反馈', description: '提交前端演示问题反馈' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/home/guide' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = `${to.meta.title || '工业控制台'} · S7 CONTROL`
})

export default router
