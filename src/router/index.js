import { createRouter, createWebHistory } from 'vue-router'
import DailyView from '../views/DailyView.vue'
import DailyListView from '../views/DailyListView.vue'
import MonthlyView from '../views/MonthlyView.vue'

const routes = [
  {
    path: '/',
    redirect: '/daily'
  },
  {
    path: '/daily',
    name: 'Daily',
    component: DailyView,
    meta: { title: '写日报' }
  },
  {
    path: '/daily/list',
    name: 'DailyList',
    component: DailyListView,
    meta: { title: '日报列表' }
  },
  {
    path: '/monthly',
    name: 'Monthly',
    component: MonthlyView,
    meta: { title: '月报生成' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — 日报月报助手` : '日报月报助手'
})

export default router
