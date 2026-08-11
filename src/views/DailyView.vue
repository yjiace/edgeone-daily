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
          <!-- 自定义主题日期选择器 -->
          <CustomDatePicker
            id="daily-date-picker"
            v-model="store.current.date"
            :disabled="store.pageLoading"
            @change="onDateChange"
          />
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
import { onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useDailyStore } from '../stores/daily.js'
import DailyEditor from '../components/DailyEditor.vue'
import CustomDatePicker from '../components/CustomDatePicker.vue'

const store = useDailyStore()
const route = useRoute()
const showToast = inject('showToast')

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

/* ── 加载状态 ── */
.page-loading-card { padding: var(--space-2xl); }

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}
</style>
