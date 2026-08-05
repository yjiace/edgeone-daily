<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <h1>日报月报<br>助手</h1>
        <p>AI 驱动的工作记录助手</p>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-title">日报</div>
        <RouterLink class="nav-item" :class="{ active: $route.name === 'Daily' }" to="/daily">
          <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          写日报
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: $route.name === 'DailyList' }" to="/daily/list">
          <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          日报列表
        </RouterLink>

        <div class="nav-section-title">月报</div>
        <RouterLink class="nav-item" :class="{ active: $route.name === 'Monthly' }" to="/monthly">
          <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          月报生成
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        <div class="today-badge">
          <span class="today-dot"></span>
          {{ todayStr }}
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>

  <!-- 全局 Toast -->
  <Transition name="toast-fade">
    <div v-if="toast.show" :class="['toast', toast.type]">
      <span class="toast-icon">
        <span v-if="toast.type === 'success'">✓</span>
        <span v-else-if="toast.type === 'error'">✕</span>
        <span v-else>•</span>
      </span>
      {{ toast.message }}
    </div>
  </Transition>
</template>

<script setup>
import { reactive, computed } from 'vue'

// 今日日期
const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
})

// 全局 Toast（通过 provide 暴露给子组件）
const toast = reactive({ show: false, message: '', type: 'success' })

let toastTimer = null
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.show = false
  setTimeout(() => {
    toast.message = message
    toast.type = type
    toast.show = true
    toastTimer = setTimeout(() => { toast.show = false }, 3000)
  }, 50)
}

import { provide } from 'vue'
provide('showToast', showToast)
</script>

<style scoped>
.sidebar-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.today-badge {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.today-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Toast 动画 */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.toast-icon {
  font-size: 1rem;
  flex-shrink: 0;
}
.toast.success .toast-icon { color: var(--color-success); }
.toast.error   .toast-icon { color: var(--color-danger); }
.toast.warning .toast-icon { color: var(--color-warning); }
</style>
