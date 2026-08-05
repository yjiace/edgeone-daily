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
          <!-- 拟物修饰 SVG 图标：写日报 -->
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>写日报</span>
        </RouterLink>

        <RouterLink class="nav-item" :class="{ active: $route.name === 'DailyList' }" to="/daily/list">
          <!-- 拟物修饰 SVG 图标：日报列表 -->
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <span>日报归档</span>
        </RouterLink>

        <div class="nav-section-title">月度总结</div>
        
        <RouterLink class="nav-item" :class="{ active: $route.name === 'Monthly' }" to="/monthly">
          <!-- 拟物修饰 SVG 图标：月报生成 -->
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
    // 1. 检查是否启用鉴权
    const res = await fetch('/api/auth/check')
    const { required } = await res.json()

    if (!required) return // 无需鉴权，直接通过

    // 2. 检查本地缓存的密码
    const cached = localStorage.getItem(AUTH_STORAGE_KEY)
    if (cached) {
      // 用缓存密码验证
      const vRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cached })
      })
      const vData = await vRes.json()
      if (vData.ok) return // 缓存密码有效，直接通过
      // 缓存密码失效（如密码已更新），清除并弹出输入框
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }

    // 3. 弹出密码输入框
    authVisible.value = true
  } catch (e) {
    // 网络异常时允许访问（防止服务异常导致完全不可用）
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
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-bottom: 1px solid var(--glass-border);
}

.logo-badge {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--grad-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  flex-shrink: 0;
}

.logo-icon {
  width: 22px;
  height: 22px;
  color: #ffffff;
}

.sidebar-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.1);
}

.today-badge {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.today-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 10px var(--color-success);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.toast-icon-wrap {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-svg {
  width: 18px;
  height: 18px;
}

.toast.success .toast-svg { color: var(--color-success); }
.toast.error   .toast-svg { color: var(--color-danger); }
.toast.warning .toast-svg { color: var(--color-warning); }
</style>
