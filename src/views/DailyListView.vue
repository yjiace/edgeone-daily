<template>
  <div class="page-container">
    <div class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">
            <svg class="page-title-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            日报归档
          </h1>
          <p class="page-subtitle">查看、修改和管理历史日报记录</p>
        </div>
        <div class="flex gap-sm items-center">
          <select id="list-month-select" v-model="selectedMonth" class="form-select month-select" @change="loadList">
            <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <RouterLink to="/daily" class="btn btn-primary btn-sm">
            <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/>
              <path d="M12 5v14"/>
            </svg>
            写日报
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.listLoading" class="loading-wrapper">
      <div class="loading-spinner" style="width:24px;height:24px;border-width:3px;"></div>
      <span class="text-secondary">加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="currentList.length === 0" class="card">
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
        </svg>
        <div class="empty-state-title">{{ selectedMonth }} 暂无日报</div>
        <div class="empty-state-desc">这个月还没有日报记录，去写一篇吧</div>
        <RouterLink to="/daily" class="btn btn-primary mt-md">
          <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          去写日报
        </RouterLink>
      </div>
    </div>

    <!-- 日报列表 -->
    <div v-else class="daily-list">
      <div
        v-for="item in currentList"
        :key="item.date"
        class="daily-card card"
      >
        <div class="daily-card-header">
          <div class="daily-meta">
            <span class="daily-date">{{ item.date }}</span>
            <span class="daily-weekday">{{ getWeekday(item.date) }}</span>
          </div>
          <div class="flex gap-sm">
            <RouterLink
              :to="`/daily?date=${item.date}`"
              class="btn btn-secondary btn-sm"
              :id="`btn-edit-${item.date}`"
            >
              <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
              编辑
            </RouterLink>
            <button
              class="btn btn-danger btn-sm btn-icon-only"
              :id="`btn-delete-${item.date}`"
              @click="confirmDelete(item.date)"
              title="删除此日报"
            >
              <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="daily-card-body">
          <div v-if="item.title" class="daily-title">{{ item.title }}</div>
          <div v-if="item.polished" class="daily-preview">{{ truncate(item.polished, 150) }}</div>
          <div v-else class="text-muted" style="font-size:0.85rem">暂无润色内容</div>
        </div>

        <div class="daily-card-footer">
          <span class="text-muted" style="font-size:0.78rem">
            原文 {{ item.raw?.length || 0 }} 字
            <span v-if="item.updatedAt"> · 更新于 {{ formatDate(item.updatedAt) }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 删除确认弹框 -->
    <Transition name="dialog-fade">
      <div v-if="deleteDialog.show" class="dialog-overlay" @click.self="deleteDialog.show = false">
        <div class="dialog">
          <div class="dialog-title flex items-center gap-xs">
            <svg class="dialog-alert-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            确认删除
          </div>
          <div class="dialog-body">确定要删除 <strong>{{ deleteDialog.date }}</strong> 的日报吗？此操作不可撤销。</div>
          <div class="dialog-footer">
            <button class="btn btn-secondary" @click="deleteDialog.show = false">取消</button>
            <button class="btn btn-danger" @click="doDelete" :disabled="deleteDialog.loading">
              <span v-if="deleteDialog.loading" class="loading-spinner"></span>
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { inject } from 'vue'
import { useDailyStore } from '../stores/daily.js'

const store = useDailyStore()
const showToast = inject('showToast')

// 月份选择
const selectedMonth = ref(getThisMonth())

function getThisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

// 生成近 12 个月的选项
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

const currentList = computed(() => {
  const list = store.listCache[selectedMonth.value] || []
  return [...list].sort((a, b) => b.date.localeCompare(a.date))
})

async function loadList() {
  await store.fetchList(selectedMonth.value)
}

onMounted(loadList)

// 工具函数
function getWeekday(dateStr) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[new Date(dateStr).getDay()]
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

// 删除
const deleteDialog = ref({ show: false, date: null, loading: false })

function confirmDelete(date) {
  deleteDialog.value = { show: true, date, loading: false }
}

async function doDelete() {
  deleteDialog.value.loading = true
  try {
    await store.deleteDaily(deleteDialog.value.date)
    deleteDialog.value.show = false
    showToast('日报已删除', 'success')
    await loadList()
  } catch (e) {
    showToast('删除失败：' + e.message, 'error')
  } finally {
    deleteDialog.value.loading = false
  }
}
</script>

<style scoped>
.page-title-svg {
  width: 24px;
  height: 24px;
  color: var(--color-primary-light);
}

.month-select {
  width: auto;
  min-width: 160px;
}

.btn-svg {
  width: 14px;
  height: 14px;
}

.btn-icon-only {
  padding: 6px;
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-2xl);
}

.daily-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.daily-card {
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.daily-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  border-color: rgba(99, 102, 241, 0.3);
}

.daily-card-header {
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.daily-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.daily-date {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.daily-weekday {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  background: rgba(255, 255, 255, 0.6);
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(203, 213, 225, 0.5);
}

.daily-card-body {
  padding: var(--space-md) var(--space-lg);
}

.daily-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-sm);
}

.daily-preview {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.daily-card-footer {
  padding: var(--space-sm) var(--space-lg);
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

/* 弹框 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(6px);
}

.dialog {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 1);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  max-width: 400px;
  width: 90%;
  box-shadow: var(--shadow-3d);
}

.dialog-alert-svg {
  width: 20px;
  height: 20px;
  color: var(--color-warning);
}

.dialog-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--color-text-primary);
}

.dialog-body {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--space-xl);
}

.dialog-footer {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
