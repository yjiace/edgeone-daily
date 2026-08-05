<template>
  <div class="page-container monthly-page">
    <!-- 全局集成控制栏 (Consolidated Master Header) -->
    <div class="monthly-master-header card">
      <div class="header-main-row">
        <!-- 左侧：标题、月份选择器与数据元信息 -->
        <div class="header-left">
          <div class="title-group">
            <svg class="header-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18"/>
              <path d="M18 17V9"/>
              <path d="M13 17V5"/>
              <path d="M8 17v-3"/>
            </svg>
            <h1 class="page-title-text">月度工作计划与考核表</h1>
          </div>
          
          <select id="monthly-month-select" v-model="store.currentMonth" class="month-select-pill" @change="onMonthChange">
            <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>

          <div class="stat-pill">
            <span class="pill-label">当月日报：</span>
            <strong class="pill-value" :class="{ 'text-warning': store.dailyCount === 0 }">{{ store.dailyCount }} 条</strong>
          </div>

          <div class="stat-pill">
            <span class="pill-label">状态：</span>
            <span v-if="store.hasSaved" class="badge badge-success">已保存</span>
            <span v-else-if="store.rows.length > 0" class="badge badge-warning">未保存</span>
            <span v-else class="badge badge-subtle">未生成</span>
          </div>
        </div>

        <!-- 右侧：统计校验与统一风格工具按钮组 -->
        <div class="header-right">
          <WeightAlert />

          <div class="action-btn-group">
            <!-- 整理生成 (统一写日报页面的 btn-primary 炫彩渐变按钮，去 AI 化) -->
            <button
              id="btn-generate-monthly"
              class="btn btn-primary"
              :disabled="store.dailyCount === 0 || store.generating"
              @click="doGenerate"
            >
              <span v-if="store.generating" class="loading-spinner"></span>
              <svg v-else class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                <path d="M5 3v4"/>
                <path d="M19 17v4"/>
                <path d="M3 5h4"/>
                <path d="M17 19h4"/>
              </svg>
              <span>{{ store.generating ? '生成中...' : '生成月报' }}</span>
            </button>

            <!-- 添加行 -->
            <button v-if="store.rows.length > 0" class="btn btn-secondary" @click="store.addRow" id="btn-add-row">
              <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/>
                <path d="M12 5v14"/>
              </svg>
              添加行
            </button>

            <!-- 保存 -->
            <button
              v-if="store.rows.length > 0"
              id="btn-save-monthly"
              class="btn btn-primary"
              :disabled="store.saving"
              @click="doSave"
            >
              <span v-if="store.saving" class="loading-spinner"></span>
              <svg v-else class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15.2 3a1 1 0 0 1 .7.3l4.8 4.8a1 1 0 0 1 .3.7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
                <path d="M17 21v-8H7v8"/>
                <path d="M7 3v5h8"/>
              </svg>
              <span>{{ store.saving ? '保存中...' : '保存' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 零日报提示 -->
      <div v-if="store.dailyCount === 0" class="no-daily-banner">
        ⚠️ 本月暂无日报记录，请先在「写日报」中录入工作日志后再生成月报
      </div>
    </div>

    <!-- 1. 加载中遮罩 -->
    <div v-if="store.loading" class="card loading-card">
      <div class="loading-wrapper">
        <div class="loading-spinner" style="width:28px;height:28px;border-width:3px;"></div>
        <span class="text-secondary">正在获取 {{ store.currentMonth }} 的月报与统计数据...</span>
      </div>
    </div>

    <!-- 2. 生成中的流式输出 -->
    <div v-else-if="store.generating && store.generateStream" class="card stream-card">
      <div class="card-header">
        <span class="card-title">
          <svg class="header-icon text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          正在整理月报...
        </span>
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="card-body">
        <div class="stream-box">{{ store.generateStream }}</div>
      </div>
    </div>

    <!-- 3. 主体大表格工作区 -->
    <div v-else-if="store.rows.length > 0 && !store.generating" class="table-container-card card">
      <MonthlyTable />
    </div>

    <!-- 4. 空状态 -->
    <div v-else-if="!store.generating && !store.loading" class="card empty-card">
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <div class="empty-state-title">等待生成</div>
        <div class="empty-state-desc">
          选择月份后点击右上角「生成月报」，系统将自动整理本月工作日报
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { inject } from 'vue'
import { useMonthlyStore } from '../stores/monthly.js'
import { useDailyStore } from '../stores/daily.js'
import { aiApi } from '../api/index.js'
import MonthlyTable from '../components/MonthlyTable.vue'
import WeightAlert from '../components/WeightAlert.vue'

const store = useMonthlyStore()
const dailyStore = useDailyStore()
const showToast = inject('showToast')

// 月份选项（近 12 个月）
const monthOptions = computed(() => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    options.push({ value: val, label: val.replace('-', ' 年 ') + ' 月' })
  }
  return options
})

async function loadForMonth(month) {
  await dailyStore.fetchList(month)
  store.dailyCount = (dailyStore.listCache[month] || []).length
  await store.loadMonthly(month)
}

onMounted(() => loadForMonth(store.currentMonth))

async function onMonthChange() {
  store.resetRows()
  await loadForMonth(store.currentMonth)
}

async function doGenerate() {
  if (store.dailyCount === 0) return

  store.generating = true
  store.generateStream = ''
  store.rows = []

  await aiApi.generateMonthly(store.currentMonth, {
    onChunk: (text) => {
      store.generateStream += text
    },
    onDone: async (result) => {
      store.generating = false
      store.generateStream = ''
      if (Array.isArray(result) && result.length > 0) {
        store.setRows(result)
        try {
          await store.saveMonthly()
          showToast('AI 月报已生成并自动保存！', 'success')
        } catch {
          showToast('月报已生成，请手动点击「保存」', 'warning')
        }
      } else {
        showToast('生成结果格式异常，请重试', 'error')
      }
    },
    onError: (err) => {
      store.generating = false
      store.generateStream = ''
      showToast('生成失败：' + err.message, 'error')
    }
  })
}

async function doSave() {
  try {
    await store.saveMonthly()
    showToast('月报已保存', 'success')
  } catch (e) {
    showToast('保存失败：' + e.message, 'error')
  }
}
</script>

<style scoped>
.monthly-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.monthly-master-header {
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: var(--blur-strong);
  -webkit-backdrop-filter: var(--blur-strong);
  border: 1px solid var(--glass-border);
  border-top: 1px solid var(--glass-border-top);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.header-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.title-group {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.header-title-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary-light);
}

.page-title-text {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin: 0;
  white-space: nowrap;
}

.month-select-pill {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 5px 12px;
  outline: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.month-select-pill:hover {
  border-color: var(--color-primary);
  background: #ffffff;
}

.stat-pill {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.pill-label {
  color: var(--color-text-muted);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.action-btn-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.btn-svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.no-daily-banner {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  font-size: 0.8rem;
  color: var(--color-warning);
}

/* 主大表格卡片容器 */
.table-container-card {
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-md);
}

.loading-card, .empty-card {
  padding: var(--space-2xl);
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}

/* 流式输出 */
.stream-card {
  border-color: rgba(99, 102, 241, 0.3);
}

.stream-box {
  background: rgba(248, 250, 252, 0.8);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

/* 加载动画 */
.loading-dots {
  display: flex;
  gap: 4px;
  align-items: center;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  background: var(--color-primary);
  border-radius: 50%;
  animation: dot-bounce 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
</style>
