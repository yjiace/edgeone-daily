<template>
  <div class="page-container">
    <div class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">📊 月报生成</h1>
          <p class="page-subtitle">AI 自动整理月度工作，生成考核表所需内容</p>
        </div>
        <select id="monthly-month-select" v-model="store.currentMonth" class="form-select month-select" @change="onMonthChange">
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>
    </div>

    <!-- 月份信息卡 -->
    <div class="card info-card">
      <div class="info-row">
        <div class="info-item">
          <span class="info-label">当月日报数</span>
          <span class="info-value" :class="{ 'text-warning': store.dailyCount === 0 }">
            {{ store.dailyCount }} 条
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">月报状态</span>
          <span v-if="store.hasSaved" class="badge badge-success">已保存草稿</span>
          <span v-else-if="store.rows.length > 0" class="badge badge-warning">未保存</span>
          <span v-else class="badge" style="background:rgba(255,255,255,0.05);color:var(--color-text-muted)">未生成</span>
        </div>
        <div class="info-item" v-if="store.updatedAt">
          <span class="info-label">最后更新</span>
          <span class="info-value text-secondary">{{ formatDateTime(store.updatedAt) }}</span>
        </div>
        <div class="info-actions">
          <button
            id="btn-generate-monthly"
            class="btn btn-primary btn-lg"
            :disabled="store.dailyCount === 0 || store.generating"
            @click="doGenerate"
          >
            <span v-if="store.generating" class="loading-spinner"></span>
            <span v-else>🤖</span>
            {{ store.generating ? 'AI 生成中...' : '生成月报' }}
          </button>
        </div>
      </div>
      <div v-if="store.dailyCount === 0" class="no-daily-tip">
        ⚠️ 本月暂无日报记录，请先写日报后再生成月报
      </div>
    </div>

    <!-- 加载中遮罩 -->
    <div v-if="store.loading" class="card loading-card">
      <div class="loading-wrapper">
        <div class="loading-spinner" style="width:28px;height:28px;border-width:3px;"></div>
        <span class="text-secondary">正在获取 {{ store.currentMonth }} 的月报草稿与统计数据...</span>
      </div>
    </div>

    <!-- 生成中的流式输出 -->
    <div v-else-if="store.generating && store.generateStream" class="card stream-card">
      <div class="card-header">
        <span class="card-title">🤖 AI 生成中...</span>
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="card-body">
        <div class="stream-box">{{ store.generateStream }}</div>
      </div>
    </div>

    <!-- 月报表格 -->
    <div v-else-if="store.rows.length > 0 && !store.generating" class="card">
      <div class="card-header">
        <span class="card-title">📋 月度工作计划与考核表</span>
        <div class="flex gap-sm items-center">
          <WeightAlert />
          <button class="btn btn-secondary btn-sm" @click="store.addRow" id="btn-add-row">
            ＋ 添加行
          </button>
          <button
            id="btn-save-monthly"
            class="btn btn-primary"
            :disabled="store.saving"
            @click="doSave"
          >
            <span v-if="store.saving" class="loading-spinner"></span>
            💾 {{ store.saving ? '保存中...' : '保存草稿' }}
          </button>
        </div>
      </div>
      <div class="card-body" style="padding:0; overflow-x:auto;">
        <MonthlyTable />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!store.generating && !store.loading" class="card">
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title">暂无月报内容</div>
        <div class="empty-state-desc">
          选择月份后点击「生成月报」，AI 将自动整理本月工作日报
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
  // 加载该月日报数量
  await dailyStore.fetchList(month)
  store.dailyCount = (dailyStore.listCache[month] || []).length

  // 加载月报草稿
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
          showToast('AI 月报已生成并自动保存草稿！', 'success')
        } catch {
          showToast('月报已生成，请手动点击「保存草稿」', 'warning')
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
    showToast('月报草稿已保存', 'success')
  } catch (e) {
    showToast('保存失败：' + e.message, 'error')
  }
}

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}
</script>

<style scoped>
.month-select {
  width: auto;
  min-width: 160px;
}

.info-card {
  margin-bottom: var(--space-lg);
}

.info-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-xl);
  padding: var(--space-lg);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.info-actions {
  margin-left: auto;
}

.no-daily-tip {
  padding: var(--space-sm) var(--space-lg) var(--space-md);
  font-size: 0.85rem;
  color: var(--color-warning);
  border-top: 1px solid var(--color-border);
}

.loading-card {
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
  border-color: rgba(91,143,255,0.3);
}

.stream-box {
  background: rgba(0,0,0,0.2);
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
