<template>
  <div class="page-container">
    <div class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">
            <span class="title-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </span>
            写日报
          </h1>
          <p class="page-subtitle">记录今天的工作，让 AI 帮你润色整理</p>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

    <!-- 加载中 -->
    <div v-if="store.pageLoading" class="card page-loading-card">
      <div class="loading-wrapper">
        <div class="loading-spinner" style="width:26px;height:26px;border-width:3px;"></div>
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
    await store.loadByDate(store.getTodayStr())
  }
})

async function onDateChange() {
  await store.loadByDate(store.current.date)
}
</script>

<style scoped>
.title-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.title-icon-wrap svg {
  width: 18px;
  height: 18px;
  color: var(--color-primary-light);
}

/* ── 日期选择器 ── */
.date-picker-wrapper {
  display: inline-flex;
  align-items: center;
  background: var(--glass-input);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--t-base);
  overflow: hidden;
}

.date-picker-wrapper:focus-within {
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  background: var(--glass-input-focus);
}

.date-picker-wrapper.disabled {
  opacity: 0.45;
  pointer-events: none;
}

.date-picker-input {
  flex: 1;
  min-width: 130px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 600;
  padding: 9px 6px 9px var(--space-md);
  color-scheme: dark;
  cursor: pointer;
}

.date-picker-input::-webkit-calendar-picker-indicator {
  display: none;
  -webkit-appearance: none;
}
.date-picker-input::-moz-calendar-picker-indicator {
  display: none;
}

.date-picker-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-left: 1px solid var(--border-subtle);
  cursor: pointer;
  color: var(--text-muted);
  transition: all var(--t-fast);
  outline: none;
  padding: 0;
}

.date-picker-btn:hover {
  color: var(--color-primary-light);
  background: rgba(99, 102, 241, 0.10);
}

.date-picker-btn:active {
  background: rgba(99, 102, 241, 0.18);
  transform: scale(0.93);
}

.date-picker-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

/* ── 加载状态 ── */
.page-loading-card { padding: var(--space-2xl); }

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}
</style>
