<template>
  <div class="page-container daily-archive-page" :class="{ 'calendar-fit-viewport': viewMode === 'calendar' }">
    <!-- 顶部精炼控制栏 (Compact Header Bar - 无边框 0.5 透明度) -->
    <div class="archive-header-bar">
      <!-- 左侧：月度统计胶囊 -->
      <div class="header-left-group">
        <div class="stats-pills-wrap">
          <div class="stat-pill-item" title="当月已记录天数">
            <span class="pill-dot green-dot"></span>
            <span class="pill-title">已记录:</span>
            <strong class="pill-data">{{ stats.recordedCount }} / {{ stats.daysInMonth }} 天</strong>
          </div>
          <div class="stat-pill-item" title="当月累计记录字数">
            <span class="pill-dot blue-dot"></span>
            <span class="pill-title">累计字数:</span>
            <strong class="pill-data">{{ stats.totalChars.toLocaleString() }} 字</strong>
          </div>
          <div class="stat-pill-item" title="当月记录覆盖率">
            <span class="pill-dot purple-dot"></span>
            <span class="pill-title">覆盖率:</span>
            <strong class="pill-data">{{ stats.coverageRate }}%</strong>
          </div>
        </div>
      </div>

      <!-- 右侧：视图切换 + 月份翻页控制器 -->
      <div class="header-right-group">
        <!-- 视图切换器 -->
        <div class="view-switch-tabs">
          <button
            class="view-tab-btn"
            :class="{ active: viewMode === 'calendar' }"
            @click="viewMode = 'calendar'"
            title="日历视图"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>日历</span>
          </button>
          <button
            class="view-tab-btn"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="列表视图"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <span>列表</span>
          </button>
        </div>

        <!-- 月份翻页导航控制器 -->
        <div class="month-navigator">
          <button class="nav-arrow-btn" @click="changeMonthOffset(-1)" title="上一月"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></button>
          <div class="month-selector-wrap">
            <select v-model="selectedMonth" class="month-select-input" @change="loadList">
              <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
            <span class="month-select-label">{{ formatMonthTitle(selectedMonth) }}</span>
          </div>
          <button class="nav-arrow-btn" @click="changeMonthOffset(1)" title="下一月"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button>
        </div>

        <button v-if="selectedMonth !== getThisMonth()" class="btn btn-secondary btn-sm today-btn" @click="goThisMonth" title="回到当月">本月</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.listLoading" class="loading-wrapper card">
      <div class="loading-spinner" style="width:28px;height:28px;border-width:3px;"></div>
      <span class="text-secondary font-medium">正在获取 {{ formatMonthTitle(selectedMonth) }} 的日报...</span>
    </div>

    <!-- 日历视图 -->
    <div v-else-if="viewMode === 'calendar'" class="calendar-container card">
      <div class="calendar-week-header">
        <div v-for="(w, idx) in weekHeaders" :key="w" class="week-col" :class="{ weekend: idx === 0 || idx === 6 }"><span>{{ w }}</span></div>
      </div>
      <div class="calendar-grid">
        <div v-for="cell in calendarCells" :key="cell.date" class="calendar-cell" :class="{ 'other-month': cell.isOtherMonth, 'is-today': cell.isToday, 'has-daily': !!cell.daily, 'is-weekend': cell.isWeekend, 'is-future': cell.isFuture }">
          <div class="cell-top">
            <div class="cell-day-wrap"><span class="cell-day-number">{{ cell.dayNumber }}</span><span v-if="cell.isToday" class="today-tag">今日</span></div>
            <div v-if="cell.daily" class="cell-status-badge"><span class="daily-done-dot"></span><span class="char-count-pill">{{ cell.daily.raw?.length || 0 }}字</span></div>
          </div>
          <div class="cell-body">
            <div v-if="cell.daily" class="daily-content-box" @click="openPreview(cell.daily)" title="点击查看日报详情速览">
              <div v-if="cell.daily.title" class="daily-item-title">{{ cell.daily.title }}</div>
              <div class="daily-item-preview">{{ truncate(cell.daily.polished || cell.daily.raw || '已记录', 70) }}</div>
            </div>
            <div v-else-if="!cell.isOtherMonth && !cell.isFuture" class="empty-day-box">
              <RouterLink :to="`/daily?date=${cell.date}`" class="btn-add-daily" title="填写此日期的日报"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg><span>补写</span></RouterLink>
            </div>
          </div>
          <div v-if="cell.daily" class="cell-footer-actions">
            <button class="cell-action-btn action-preview" @click.stop="openPreview(cell.daily)" title="查看"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg><span>查看</span></button>
            <RouterLink :to="`/daily?date=${cell.date}`" class="cell-action-btn action-edit" title="编辑"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg><span>编辑</span></RouterLink>
            <button class="cell-action-btn action-delete" @click.stop="confirmDelete(cell.daily)" title="删除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else-if="viewMode === 'list'" class="daily-list">
      <div v-if="filteredList.length === 0" class="empty-state card">
        <div class="empty-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
        <p class="empty-title">{{ selectedMonth }} 暂无日报记录</p>
        <p class="empty-desc">记录今天的工作，让每一天的努力都被看见</p>
        <RouterLink to="/daily" class="btn btn-primary" style="margin-top:var(--space-md);"><svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m-7-7h14"/></svg>立即写日报</RouterLink>
      </div>
      <div v-for="item in filteredList" :key="item.id || item.date" class="daily-card card">
        <div class="daily-card-header">
          <div class="daily-meta">
            <div class="date-block"><span class="daily-day">{{ getDay(item.date) }}</span><div class="date-detail"><span class="daily-date-full">{{ item.date }}</span><span class="daily-weekday">{{ getWeekday(item.date) }}</span></div></div>
            <div v-if="item.title" class="daily-title-preview">{{ item.title }}</div>
          </div>
          <div class="flex items-center gap-sm">
            <span class="char-badge">{{ item.raw?.length || 0 }} 字</span>
            <button class="btn btn-secondary btn-sm" @click="openPreview(item)" title="速览">速览</button>
            <RouterLink :to="`/daily?date=${item.date}`" class="btn btn-secondary btn-sm">编辑</RouterLink>
            <button class="btn btn-danger btn-sm" @click="confirmDelete(item)">删除</button>
          </div>
        </div>
        <div class="daily-card-body">
          <p v-if="item.polished" class="daily-preview">{{ truncate(item.polished, 160) }}</p>
          <p v-else-if="item.raw" class="daily-preview">{{ truncate(item.raw, 160) }}</p>
          <p v-else class="no-content">暂无内容</p>
        </div>
        <div v-if="item.updatedAt" class="daily-card-footer">
          <span class="update-time"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>更新于 {{ formatTime(item.updatedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 速览弹窗 -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div v-if="previewingDaily" class="dialog-overlay" @click.self="closePreview">
          <div class="preview-modal card">
            <div class="preview-modal-header">
              <div class="flex items-center gap-md">
                <div class="preview-date-badge"><span class="badge-day">{{ getDay(previewingDaily.date) }}</span><span class="badge-month">{{ getMonthYear(previewingDaily.date) }}</span></div>
                <div><h3 class="preview-modal-title">{{ previewingDaily.title || `${previewingDaily.date} 工作日报` }}</h3><p class="preview-modal-sub">{{ getWeekday(previewingDaily.date) }} · 累计 {{ previewingDaily.raw?.length || 0 }} 字</p></div>
              </div>
              <button class="btn btn-ghost btn-icon" @click="closePreview" title="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="preview-modal-body">
              <div v-if="previewingDaily.polished" class="preview-section polished-section">
                <div class="section-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg><span>AI 润色日报</span></div>
                <div class="section-content-text">{{ previewingDaily.polished }}</div>
              </div>
              <div v-if="previewingDaily.raw" class="preview-section raw-section">
                <div class="section-badge raw-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg><span>原始内容</span></div>
                <div class="section-content-text raw-text">{{ previewingDaily.raw }}</div>
              </div>
            </div>
            <div class="preview-modal-footer">
              <RouterLink :to="`/daily?date=${previewingDaily.date}`" class="btn btn-primary btn-sm" @click="closePreview"><svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>去编辑此日报</RouterLink>
              <button class="btn btn-secondary btn-sm" @click="closePreview">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div v-if="deletingItem" class="dialog-overlay" @click.self="deletingItem = null">
          <div class="dialog card">
            <div class="dialog-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
            <h3 class="dialog-title">确认删除日报？</h3>
            <p class="dialog-body">确定要删除 <strong>{{ deletingItem.date }}</strong> 的日报吗？<br>删除后内容将无法恢复。</p>
            <div class="dialog-footer">
              <button class="btn btn-secondary" :disabled="deleteLoading" @click="deletingItem = null">取消</button>
              <button class="btn btn-danger" :disabled="deleteLoading" @click="handleDelete">{{ deleteLoading ? '删除中...' : '确认删除' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useDailyStore } from '../stores/daily'

const store = useDailyStore()
const viewMode = ref('calendar')
const previewingDaily = ref(null)
const selectedMonth = ref(getThisMonth())
const deletingItem = ref(null)
const deleteLoading = ref(false)
const weekHeaders = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function getThisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getTodayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const monthOptions = computed(() => {
  const opts = []
  const now = new Date()
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
    opts.push({ value: val, label })
  }
  return opts
})

// 当月日报列表
const curMonthList = computed(() => {
  return store.listCache[selectedMonth.value] || []
})

// 排序后的列表
const filteredList = computed(() => {
  return curMonthList.value.slice().sort((a, b) => b.date.localeCompare(a.date))
})

// 当月日报统计数据
const stats = computed(() => {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const list = curMonthList.value
  const recordedCount = list.length
  const totalChars = list.reduce((acc, item) => acc + ((item.raw || '').length), 0)
  const coverageRate = daysInMonth > 0 ? Math.round((recordedCount / daysInMonth) * 100) : 0
  return { daysInMonth, recordedCount, totalChars, coverageRate }
})

// 日历单元格数据（周日为第 1 列）
const calendarCells = computed(() => {
  const [yearStr, monthStr] = selectedMonth.value.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const firstDay = new Date(year, month - 1, 1)
  const daysInCurMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()
  const startDayOfWeek = firstDay.getDay()
  const dailyMap = {}
  curMonthList.value.forEach(item => dailyMap[item.date] = item)
  const todayStr = getTodayString()
  const todayDate = new Date(todayStr)
  const cells = []
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const prevMonthDate = new Date(year, month - 2, d)
    const yStr = prevMonthDate.getFullYear()
    const mStr = String(prevMonthDate.getMonth() + 1).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const fullDate = `${yStr}-${mStr}-${dStr}`
    const cellDate = new Date(fullDate)
    cells.push({ date: fullDate, dayNumber: d, isOtherMonth: true, isToday: fullDate === todayStr, isWeekend: prevMonthDate.getDay() === 0 || prevMonthDate.getDay() === 6, isFuture: cellDate > todayDate, daily: null })
  }
  for (let d = 1; d <= daysInCurMonth; d++) {
    const dStr = String(d).padStart(2, '0')
    const fullDate = `${yearStr}-${monthStr}-${dStr}`
    const curDate = new Date(year, month - 1, d)
    const cellDate = new Date(fullDate)
    cells.push({ date: fullDate, dayNumber: d, isOtherMonth: false, isToday: fullDate === todayStr, isWeekend: curDate.getDay() === 0 || curDate.getDay() === 6, isFuture: cellDate > todayDate, daily: dailyMap[fullDate] || null })
  }
  const totalSlots = cells.length > 35 ? 42 : 35
  const remaining = totalSlots - cells.length
  for (let d = 1; d <= remaining; d++) {
    const nextMonthDate = new Date(year, month, d)
    const yStr = nextMonthDate.getFullYear()
    const mStr = String(nextMonthDate.getMonth() + 1).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const fullDate = `${yStr}-${mStr}-${dStr}`
    const cellDate = new Date(fullDate)
    cells.push({ date: fullDate, dayNumber: d, isOtherMonth: true, isToday: fullDate === todayStr, isWeekend: nextMonthDate.getDay() === 0 || nextMonthDate.getDay() === 6, isFuture: cellDate > todayDate, daily: null })
  }
  return cells
})

function changeMonthOffset(delta) {
  const [y, m] = selectedMonth.value.split('-')
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1 + delta, 1)
  selectedMonth.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  loadList()
}

function goThisMonth() {
  selectedMonth.value = getThisMonth()
  loadList()
}

async function loadList() {
  await store.fetchList(selectedMonth.value)
}

function openPreview(daily) { previewingDaily.value = daily }
function closePreview() { previewingDaily.value = null }
function confirmDelete(daily) { deletingItem.value = daily }

async function handleDelete() {
  if (!deletingItem.value) return
  deleteLoading.value = true
  try {
    await store.deleteDaily(deletingItem.value.date)
    deletingItem.value = null
    await loadList()
  } finally { deleteLoading.value = false }
}

function getDay(dateStr) { return dateStr ? dateStr.split('-')[2] : '' }
function getMonthYear(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return `${parts[0]}年${parts[1]}月`
}
function getWeekday(dateStr) {
  if (!dateStr) return ''
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[new Date(dateStr).getDay()] || ''
}
function formatMonthTitle(monthStr) {
  if (!monthStr) return ''
  const [y, m] = monthStr.split('-')
  return `${y} 年 ${parseInt(m, 10)} 月`
}
function formatTime(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  } catch { return isoStr }
}
function truncate(str, len = 60) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

onMounted(() => { loadList() })
</script>

<style scoped>
/* ══════════════════════════════════════
   整屏无滚动条日历布局（0.5 透明度，无边框）
══════════════════════════════════════ */
.daily-archive-page.calendar-fit-viewport {
  height: 100vh;
  box-sizing: border-box;
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── 顶部精炼控制栏 ── */
.archive-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-shrink: 0;
  padding: 6px 14px;
  /* background: rgba(255, 255, 255, 0.50); */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.header-left-group {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  min-width: 0;
}

/* ── 统计药丸胶囊 ── */
.stats-pills-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-pill-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.50);
  border: none;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.green-dot  { background: #10b981; box-shadow: 0 0 4px #10b981; }
.blue-dot   { background: #3b82f6; box-shadow: 0 0 4px #3b82f6; }
.purple-dot { background: #8b5cf6; box-shadow: 0 0 4px #8b5cf6; }

.pill-title {
  color: var(--text-muted);
  font-weight: 500;
}

.pill-data {
  color: var(--text-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.header-right-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ── 视图切换 Tabs ── */
.view-switch-tabs {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.50);
  backdrop-filter: blur(16px);
  border: none;
  border-radius: var(--radius-md);
  padding: 2px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.view-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--t-fast);
}

.view-tab-btn svg {
  width: 13px;
  height: 13px;
}

.view-tab-btn:hover {
  color: var(--text-primary);
}

.view-tab-btn.active {
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* ── 月份翻页导航控制器 ── */
.month-navigator {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.50);
  backdrop-filter: blur(20px);
  border: none;
  border-radius: var(--radius-md);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.nav-arrow-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--t-fast);
}

.nav-arrow-btn svg {
  width: 14px;
  height: 14px;
}

.nav-arrow-btn:hover:not(:disabled) {
  background: rgba(79, 70, 229, 0.08);
  color: var(--color-primary);
}

.nav-arrow-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.month-selector-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  min-width: 105px;
  height: 30px;
  border: none;
}

.month-select-label {
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  pointer-events: none;
}

.month-select-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.today-btn {
  font-size: 0.78rem;
  padding: 5px 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.50);
  border: none;
  height: 30px;
  display: inline-flex;
  align-items: center;
}

.btn-svg {
  width: 13px;
  height: 13px;
}

/* ── 加载状态 ── */
.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-2xl);
  background: rgba(255, 255, 255, 0.50);
  border: none;
  border-radius: var(--radius-xl);
  flex: 1;
}

/* ══════════════════════════════════════
   日历视图核心网格系统（0.5 透明度，无边框）
══════════════════════════════════════ */
.calendar-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.50);
  backdrop-filter: blur(32px) saturate(200%);
  -webkit-backdrop-filter: blur(32px) saturate(200%);
  border: none;
  border-radius: var(--radius-xl);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.calendar-week-header {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.week-col {
  text-align: center;
  padding: 5px 2px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.40);
  border: none;
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
}

.week-col.weekend {
  color: #e11d48;
  background: rgba(254, 242, 242, 0.50);
  border: none;
}

.calendar-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: repeat(var(--grid-rows, 6), minmax(0, 1fr));
  gap: 6px;
}

/* ── 单个日历单元格 ── */
.calendar-cell {
  height: 100%;
  min-height: 0;
  background: rgba(255, 255, 255, 0.50);
  border: none;
  border-radius: var(--radius-md);
  padding: 5px 7px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  transition: transform var(--t-base), box-shadow var(--t-base), background var(--t-base);
  overflow: hidden;
  box-sizing: border-box;
}

.calendar-cell:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
  z-index: 2;
}

/* 非当月日期 */
.calendar-cell.other-month {
  opacity: 0.35;
  background: rgba(255, 255, 255, 0.20);
  border: none;
}

.calendar-cell.other-month:hover {
  transform: none;
  box-shadow: none;
  opacity: 0.45;
}

/* 周末轻柔背景 */
.calendar-cell.is-weekend:not(.other-month) {
  background: rgba(255, 255, 255, 0.45);
}

/* 今天高亮 */
.calendar-cell.is-today {
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 0 0 2px var(--color-primary), 0 4px 16px rgba(99, 102, 241, 0.15);
  border: none;
}

/* 有日报的日期 */
.calendar-cell.has-daily {
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.06);
  border: none;
}

.calendar-cell.has-daily:hover {
  background: rgba(255, 255, 255, 0.90);
  box-shadow: 0 8px 22px rgba(16, 185, 129, 0.14);
}

/* 单元格头部 */
.cell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  flex-shrink: 0;
}

.cell-day-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cell-day-number {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.is-today .cell-day-number {
  color: var(--color-primary);
}

.today-tag {
  font-size: 0.6rem;
  font-weight: 700;
  color: #ffffff;
  background: var(--grad-primary);
  padding: 1px 4px;
  border-radius: 3px;
  line-height: 1.1;
}

.cell-status-badge {
  display: flex;
  align-items: center;
  gap: 3px;
}

.daily-done-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.6);
}

.char-count-pill {
  font-size: 0.62rem;
  font-weight: 600;
  color: #059669;
  background: rgba(16, 185, 129, 0.12);
  border: none;
  padding: 0 4px;
  border-radius: 3px;
}

/* 单元格 Body */
.cell-body {
  flex: 1;
  min-height: 0;
  margin: 3px 0 2px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.daily-content-box {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 3px 5px;
  background: rgba(255, 255, 255, 0.50);
  border-radius: var(--radius-sm);
  border: none;
  height: 100%;
  overflow: hidden;
  transition: all var(--t-fast);
}

.daily-content-box:hover {
  background: rgba(255, 255, 255, 0.85);
}

.daily-item-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.daily-item-preview {
  font-size: 0.65rem;
  color: var(--text-muted);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 空白可补写状态 */
.empty-day-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0;
  transition: opacity var(--t-fast);
}

.calendar-cell:hover .empty-day-box {
  opacity: 1;
}

.btn-add-daily {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.12);
  border: none;
  padding: 2px 6px;
  border-radius: 4px;
  text-decoration: none;
  transition: all var(--t-fast);
}

.btn-add-daily svg {
  width: 10px;
  height: 10px;
}

.btn-add-daily:hover {
  background: var(--color-primary);
  color: #ffffff;
}

/* 单元格底部操作条 */
.cell-footer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  padding-top: 2px;
  border: none;
  opacity: 0;
  transform: translateY(2px);
  transition: all var(--t-fast);
  flex-shrink: 0;
}

.calendar-cell:hover .cell-footer-actions {
  opacity: 1;
  transform: translateY(0);
}

.cell-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 3px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  line-height: 1.2;
}

.cell-action-btn svg {
  width: 9px;
  height: 9px;
}

.action-preview {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.65);
  border: none;
}
.action-preview:hover {
  background: rgba(255, 255, 255, 0.95);
  color: var(--text-primary);
}

.action-edit {
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.12);
  border: none;
}
.action-edit:hover {
  background: var(--color-primary);
  color: #ffffff;
}

.action-delete {
  color: var(--color-danger);
  background: rgba(254, 226, 226, 0.65);
  border: none;
  padding: 2px 5px;
}
.action-delete:hover {
  background: var(--color-danger);
  color: #ffffff;
}

/* ══════════════════════════════════════
   列表视图（0.5 透明度，无边框）
══════════════════════════════════════ */
.daily-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  overflow-y: auto;
  flex: 1;
  padding-right: 4px;
  margin-top: 10px;
}

.daily-card {
  transition: transform var(--t-base), box-shadow var(--t-base);
  background: rgba(255, 255, 255, 0.50);
  backdrop-filter: blur(24px);
  border: none;
}

.daily-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.65);
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.06);
}

.daily-card-header {
  padding: var(--space-md) var(--space-lg);
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.daily-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  flex: 1;
}

.date-block {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.daily-day {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
}

.date-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.daily-date-full {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.daily-weekday {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.12);
  border: none;
  padding: 1px 6px;
  border-radius: 6px;
}

.daily-title-preview {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.char-badge {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.50);
  border: none;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.daily-card-body {
  padding: var(--space-md) var(--space-lg);
}

.daily-preview {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.75;
}

.no-content {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
}

.daily-card-footer {
  padding: 10px var(--space-lg);
  border: none;
  background: rgba(255, 255, 255, 0.30);
}

.update-time {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.update-time svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

/* ══════════════════════════════════════
   日报详情速览弹窗 (Quick Preview Modal)
══════════════════════════════════════ */
.preview-modal {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(36px) saturate(200%);
  -webkit-backdrop-filter: blur(36px) saturate(200%);
  border: none;
  border-radius: var(--radius-xl);
  max-width: 680px;
  width: 92%;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  animation: dialogPop 0.28s var(--ease-spring);
  overflow: hidden;
}

.preview-modal-header {
  padding: var(--space-lg);
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.50);
}

.preview-date-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: var(--grad-primary);
  color: #ffffff;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
  flex-shrink: 0;
}

.badge-day {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1;
}

.badge-month {
  font-size: 0.62rem;
  opacity: 0.85;
  letter-spacing: 0.02em;
}

.preview-modal-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.3;
}

.preview-modal-sub {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 3px;
}

.preview-modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.preview-section {
  background: rgba(255, 255, 255, 0.50);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-md);
}

.section-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.12);
  border: none;
  padding: 3px 8px;
  border-radius: 6px;
  margin-bottom: var(--space-sm);
}

.section-badge svg {
  width: 12px;
  height: 12px;
}

.section-content-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.8;
  white-space: pre-wrap;
}

.raw-section {
  background: rgba(255, 255, 255, 0.40);
}

.raw-badge {
  color: var(--text-muted);
  background: rgba(148, 163, 184, 0.15);
  border: none;
}

.raw-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.preview-modal-footer {
  padding: var(--space-md) var(--space-lg);
  border: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
  background: rgba(255, 255, 255, 0.50);
}

/* ══════════════════════════════════════
   删除弹框
══════════════════════════════════════ */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.dialog {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(32px) saturate(200%);
  -webkit-backdrop-filter: blur(32px) saturate(200%);
  border: none;
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  max-width: 400px;
  width: 90%;
  box-shadow: var(--shadow-lg);
  text-align: center;
  animation: dialogPop 0.3s var(--ease-spring);
}

@keyframes dialogPop {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.dialog-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(217, 119, 6, 0.10);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-md);
}

.dialog-icon-wrap svg {
  width: 24px;
  height: 24px;
  color: var(--color-warning);
}

.dialog-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: var(--space-sm);
  color: var(--text-primary);
}

.dialog-body {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: var(--space-xl);
}

.dialog-body strong {
  color: var(--text-primary);
}

.dialog-footer {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}

.dialog-fade-enter-active { transition: opacity 0.2s ease; }
.dialog-fade-leave-active { transition: opacity 0.15s ease; }
.dialog-fade-enter-from,
.dialog-fade-leave-to     { opacity: 0; }

@media (max-width: 900px) {
  .archive-header-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .header-left-group, .header-right-group {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
