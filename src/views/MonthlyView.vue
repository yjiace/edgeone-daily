<template>
  <div class="page-container monthly-page">
    <!-- 集成控制栏 -->
    <div class="monthly-master-header card">
      <div class="header-main-row">
        <!-- 左侧 -->
        <div class="header-left">
          <div class="title-group">
            <!-- <span class="title-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
              </svg>
            </span> -->
            <!-- <h1 class="page-title-text">月度工作计划与考核表</h1> -->
          </div>

          <div class="stat-pill">
            <span class="pill-label">当月日报</span>
            <strong class="pill-value" :class="{ 'text-warning': store.dailyCount === 0 }">{{ store.dailyCount }}</strong>
            <span class="pill-unit">条</span>
          </div>

          <div class="stat-pill">
            <span class="pill-label">状态</span>
            <span v-if="store.hasSaved" class="badge badge-success">已保存</span>
            <span v-else-if="store.rows.length > 0" class="badge badge-warning">未保存</span>
            <span v-else class="badge badge-subtle">未生成</span>
          </div>
        </div>

        <!-- 右侧按钮组 -->
        <div class="header-right">
          <WeightAlert />

          <div class="action-btn-group">
            <CustomMonthPicker
              id="monthly-month-select"
              v-model="store.currentMonth"
              :options="monthOptions"
              :disabled="store.generating || store.loading"
              @change="onMonthChange"
            />
            <!-- 生成月报 -->
            <button
              id="btn-generate-monthly"
              class="btn btn-primary"
              :disabled="store.dailyCount === 0 || store.generating"
              @click="doGenerate"
            >
              <span v-if="store.generating" class="loading-spinner"></span>
              <svg v-else class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
              </svg>
              <span>{{ store.generating ? '生成中...' : '生成月报' }}</span>
            </button>

            <!-- 添加行 -->
            <button v-if="store.rows.length > 0" class="btn btn-secondary" @click="store.addRow" id="btn-add-row">
              <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/><path d="M12 5v14"/>
              </svg>
              添加行
            </button>

            <!-- 保存 -->
            <button
              v-if="store.rows.length > 0"
              id="btn-save-monthly"
              class="btn btn-secondary"
              :disabled="store.saving"
              @click="doSave"
            >
              <span v-if="store.saving" class="loading-spinner"></span>
              <svg v-else class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15.2 3a1 1 0 0 1 .7.3l4.8 4.8a1 1 0 0 1 .3.7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
                <path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>
              </svg>
              <span>{{ store.saving ? '保存中...' : '保存' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 零日报提示 -->
      <!-- <div v-if="store.dailyCount === 0" class="no-daily-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        本月暂无日报记录，请先在「写日报」中录入工作日志后再生成月报
      </div> -->
    </div>

    <!-- 1. 加载中 -->
    <div v-if="store.loading" class="card loading-card">
      <div class="loading-wrapper">
        <div class="loading-spinner" style="width:26px;height:26px;border-width:3px;"></div>
        <span class="text-secondary">正在获取 {{ store.currentMonth }} 的月报与统计数据...</span>
      </div>
    </div>

    <!-- 2. 生成中 -->
    <div v-else-if="store.generating && store.generateStream" class="card stream-card">
      <div class="card-header">
        <span class="card-title">
          <span class="stream-pulse"></span>
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

    <!-- 3. 表格区 -->
    <div v-else-if="store.rows.length > 0 && !store.generating" class="table-container-card card">
      <MonthlyTable />
    </div>

    <!-- 4. 空状态 -->
    <div v-else-if="!store.generating && !store.loading" class="card empty-card">
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <div class="empty-state-title">等待生成月报</div>
        <div class="empty-state-desc">选择月份后点击「生成月报」，系统将自动整理本月工作日报，汇总为结构化考核表</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useMonthlyStore } from '../stores/monthly.js'
import { useDailyStore } from '../stores/daily.js'
import { aiApi } from '../api/index.js'
import MonthlyTable from '../components/MonthlyTable.vue'
import WeightAlert from '../components/WeightAlert.vue'
import CustomMonthPicker from '../components/CustomMonthPicker.vue'

const store = useMonthlyStore()
const dailyStore = useDailyStore()
const showToast = inject('showToast')

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
  try {
    await dailyStore.fetchList(month)
    store.dailyCount = (dailyStore.listCache[month] || []).length
    await store.loadMonthly(month)
  } catch (e) {
    console.warn('[MonthlyView] loadForMonth error:', e)
  }
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
    onChunk: (text) => { store.generateStream += text },
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

/* ── 控制栏 ── */
.monthly-master-header {
  padding: var(--space-md) var(--space-lg);
  overflow: visible;
  position: relative;
  z-index: 20;
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
  gap: var(--space-sm);
}

.title-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.15);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.title-icon-wrap svg {
  width: 16px;
  height: 16px;
  color: var(--color-primary-light);
}

.page-title-text {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  margin: 0;
  white-space: nowrap;
}


.stat-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  /* background: rgba(255, 255, 255, 0.50); */
  border: none;
  border-radius: var(--radius-sm);
  padding: 4px 10px;
}

.pill-label { color: var(--text-muted); }
.pill-value { font-weight: 800; color: var(--text-primary); }
.pill-unit  { color: var(--text-muted); font-size: 0.75rem; }

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
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.no-daily-banner {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border: none;
  font-size: 0.8rem;
  color: #fbbf24;
}

.no-daily-banner svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* ── 内容区 ── */
.table-container-card {
  padding: 0;
  overflow: hidden;
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

/* ── 流式输出 ── */
.stream-card {
  border: none;
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.08);
}

.stream-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pulse 1.5s ease-in-out infinite;
  flex-shrink: 0;
}

.stream-box {
  background: rgba(239, 246, 255, 0.50);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--text-secondary);
  white-space: pre-wrap;
  max-height: 220px;
  overflow-y: auto;
  backdrop-filter: blur(12px);
}

/* ── 加载点 ── */
.loading-dots {
  display: flex;
  gap: 4px;
  align-items: center;
}

.loading-dots span {
  width: 5px;
  height: 5px;
  background: var(--color-primary-light);
  border-radius: 50%;
  animation: dot-bounce 1.2s ease-in-out infinite;
  opacity: 0.5;
}

.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.8); }
}
</style>
