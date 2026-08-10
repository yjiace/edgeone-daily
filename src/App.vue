<template>
  <!-- 鉴权弹窗 -->
  <AuthModal :visible="authVisible" @success="onAuthSuccess" />
  <div class="app-layout">
    <!-- 玻璃侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-badge">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div>
          <h1>日报月报助手</h1>
          <p>EdgeOne AI 智能沉淀</p>
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <div class="nav-section-title">日报管理</div>
        
        <RouterLink class="nav-item" :class="{ active: $route.name === 'Daily' }" to="/daily">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>写日报</span>
        </RouterLink>

        <RouterLink class="nav-item" :class="{ active: $route.name === 'DailyList' }" to="/daily/list">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <span>日报归档</span>
        </RouterLink>

        <div class="nav-section-title">月度总结</div>
        
        <RouterLink class="nav-item" :class="{ active: $route.name === 'Monthly' }" to="/monthly">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <span>月报整理</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="today-badge">
          <span class="today-dot"></span>
          <span>今日 {{ todayStr }}</span>
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

  <!-- 全局 Toast 提示 -->
  <Transition name="toast-fade">
    <div v-if="toast.show" :class="['toast', toast.type]">
      <div class="toast-icon-wrap">
        <svg v-if="toast.type === 'success'" class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        <svg v-else-if="toast.type === 'error'" class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <svg v-else class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
      <span>{{ toast.message }}</span>
    </div>
  </Transition>
</template>

<script setup>
import { reactive, computed, provide, ref, onMounted } from 'vue'
import AuthModal from './components/AuthModal.vue'

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
})

// ============================
// 鉴权逻辑
// ============================
const AUTH_STORAGE_KEY = 'auth_password'
const authVisible = ref(false)

async function initAuth() {
  try {
    const res = await fetch('/api/auth/check')
    const { required } = await res.json()

    if (!required) return

    const cached = localStorage.getItem(AUTH_STORAGE_KEY)
    if (cached) {
      const vRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cached })
      })
      const vData = await vRes.json()
      if (vData.ok) return
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }

    authVisible.value = true
  } catch (e) {
    console.warn('[Auth] 鉴权检查失败，跳过鉴权:', e)
  }
}

function onAuthSuccess() {
  authVisible.value = false
}

onMounted(() => {
  initAuth()
})

// ============================
// Toast 提示
// ============================
const toast = reactive({ show: false, message: '', type: 'success' })

let toastTimer = null
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.show = false
  setTimeout(() => {
    toast.message = message
    toast.type = type
    toast.show = true
    toastTimer = setTimeout(() => { toast.show = false }, 3200)
  }, 50)
}

provide('showToast', showToast)
</script>

<style scoped>
.toast-icon-wrap {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-svg {
  width: 16px;
  height: 16px;
}

.toast.success .toast-svg { color: #4ade80; }
.toast.error   .toast-svg { color: #f87171; }
.toast.warning .toast-svg { color: #fbbf24; }
</style>
