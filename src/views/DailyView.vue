<template>
  <div class="page-container">
    <div class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">✍️ 写日报</h1>
          <p class="page-subtitle">记录今天的工作，让 AI 帮你润色</p>
        </div>
        <div class="flex gap-sm items-center">
          <span v-if="store.pageLoading" class="loading-spinner" title="加载中..."></span>
          <!-- 自定义日期选择器 -->
          <div class="date-picker-wrapper" :class="{ disabled: store.pageLoading }">
            <input
              id="daily-date-input"
              ref="dateInputRef"
              type="date"
              v-model="store.current.date"
              class="date-picker-input"
              :disabled="store.pageLoading"
              @change="onDateChange"
            />
            <button
              class="date-picker-btn"
              :disabled="store.pageLoading"
              @click="openDatePicker"
              title="选择日期"
              aria-label="打开日历"
            >
              <!-- 日历 SVG 图标 -->
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中遮罩 -->
    <div v-if="store.pageLoading" class="page-loading-card card">
      <div class="loading-wrapper">
        <div class="loading-spinner" style="width:28px;height:28px;border-width:3px;"></div>
        <span class="text-secondary">正在获取 {{ store.current.date }} 的日报记录...</span>
      </div>
    </div>

    <DailyEditor v-else />
  </div>
</template>

<script setup>
import { onMounted, inject, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useDailyStore } from '../stores/daily.js'
import DailyEditor from '../components/DailyEditor.vue'

const store = useDailyStore()
const route = useRoute()
const showToast = inject('showToast')
const dateInputRef = ref(null)

function openDatePicker() {
  if (dateInputRef.value && !store.pageLoading) {
    try {
      dateInputRef.value.showPicker()
    } catch {
      dateInputRef.value.focus()
    }
  }
}

onMounted(async () => {
  const dateParam = route.query.date
  if (dateParam) {
    await store.loadByDate(dateParam)
  } else {
    // 默认加载今天，如果今天有记录则展示
    await store.loadByDate(store.getTodayStr())
  }
})

async function onDateChange() {
  await store.loadByDate(store.current.date)
}
</script>

<style scoped>
/* ── 日期选择器包装容器 ── */
.date-picker-wrapper {
  display: inline-flex;
  align-items: center;
  background: var(--glass-bg-input);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(203, 213, 225, 0.7);
  border-radius: var(--radius-md);
  box-shadow: inset 0 2px 4px rgba(15, 23, 42, 0.03),
              0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all var(--transition-base);
  overflow: hidden;
}

.date-picker-wrapper:focus-within {
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15),
              inset 0 2px 4px rgba(15, 23, 42, 0.02);
  background: var(--glass-bg-input-focus);
}

.date-picker-wrapper.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* ── 原生日期 input（隐藏内置图标，只留文本） ── */
.date-picker-input {
  flex: 1;
  min-width: 130px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  font-weight: 500;
  padding: 9px 4px 9px var(--space-md);
  color-scheme: light;
  cursor: pointer;

  /* 隐藏 Chrome/Edge 原生日历图标 */
  &::-webkit-calendar-picker-indicator {
    display: none;
    -webkit-appearance: none;
  }
  /* Firefox */
  &::-moz-calendar-picker-indicator {
    display: none;
  }
}

/* ── 自定义日历图标按钮 ── */
.date-picker-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-left: 1px solid rgba(203, 213, 225, 0.5);
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
  outline: none;
  padding: 0;
}

.date-picker-btn:hover {
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.06);
}

.date-picker-btn:active {
  background: rgba(99, 102, 241, 0.12);
  transform: scale(0.95);
}

.date-picker-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

/* ── 页面加载状态卡片 ── */
.page-loading-card {
  padding: var(--space-2xl);
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}
</style>
