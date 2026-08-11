<template>
  <div class="custom-datepicker-container" ref="containerRef">
    <!-- 触发器胶囊 -->
    <button
      type="button"
      class="datepicker-trigger"
      :class="{ active: isOpen, disabled: disabled }"
      :disabled="disabled"
      @click="toggleOpen"
      title="选择日期"
      aria-label="打开日历选择器"
    >
      <span class="trigger-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </span>
      <span class="trigger-date-text">{{ modelValue || '请选择日期' }}</span>
      <span v-if="weekdayText" class="trigger-weekday-tag">{{ weekdayText }}</span>
      <span class="trigger-arrow" :class="{ 'is-open': isOpen }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    </button>

    <!-- 浮动日历毛玻璃弹层 -->
    <Transition name="picker-pop">
      <div v-if="isOpen" class="datepicker-popover" @click.stop>
        <!-- 头部导航栏 -->
        <div class="picker-header">
          <div class="nav-btn-group">
            <button type="button" class="nav-arrow-btn" @click="changeYear(-1)" title="上一年">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="11 17 6 12 11 7"></polyline>
                <polyline points="18 17 13 12 18 7"></polyline>
              </svg>
            </button>
            <button type="button" class="nav-arrow-btn" @click="changeMonth(-1)" title="上一月">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>

          <div class="picker-title">
            <span class="title-year">{{ currentViewYear }} 年</span>
            <span class="title-month">{{ currentViewMonth + 1 }} 月</span>
          </div>

          <div class="nav-btn-group">
            <button type="button" class="nav-arrow-btn" @click="changeMonth(1)" title="下一月">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            <button type="button" class="nav-arrow-btn" @click="changeYear(1)" title="下一年">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <!-- 星期表头 -->
        <div class="picker-weekdays">
          <span v-for="(w, idx) in weekDays" :key="w" class="weekday-cell" :class="{ weekend: idx === 5 || idx === 6 }">
            {{ w }}
          </span>
        </div>

        <!-- 日期网格 (42格) -->
        <div class="picker-calendar-grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.dateStr"
            type="button"
            class="calendar-day-btn"
            :class="{
              'other-month': !cell.isCurrentMonth,
              'is-today': cell.isToday,
              'is-selected': cell.isSelected,
              'is-weekend': cell.isWeekend
            }"
            @click="selectDate(cell)"
          >
            <span class="day-num">{{ cell.day }}</span>
            <span v-if="cell.isToday && !cell.isSelected" class="today-indicator"></span>
          </button>
        </div>

        <!-- 底部快捷栏 -->
        <div class="picker-footer">
          <div class="quick-links">
            <button type="button" class="quick-btn" @click="selectPreset('yesterday')">昨天</button>
            <button type="button" class="quick-btn today-quick-btn" @click="selectPreset('today')">今天</button>
          </div>
          <button type="button" class="close-btn" @click="closePopover">关闭</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const containerRef = ref(null)
const isOpen = ref(false)

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// 当前日历视图查看的年月 (0-indexed month)
const currentViewYear = ref(new Date().getFullYear())
const currentViewMonth = ref(new Date().getMonth())

// 初始化视图为选中的日期对应月份
function initViewDate() {
  if (props.modelValue) {
    const parts = props.modelValue.split('-').map(Number)
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      currentViewYear.value = parts[0]
      currentViewMonth.value = parts[1] - 1
      return
    }
  }
  const now = new Date()
  currentViewYear.value = now.getFullYear()
  currentViewMonth.value = now.getMonth()
}

watch(() => props.modelValue, () => {
  if (!isOpen.value) {
    initViewDate()
  }
}, { immediate: true })

// 星期计算
const weekdayText = computed(() => {
  if (!props.modelValue) return ''
  const parts = props.modelValue.split('-').map(Number)
  if (parts.length !== 3) return ''
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[d.getDay()] || ''
})

function formatDayStr(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

// 42格日历网格计算
const calendarCells = computed(() => {
  const year = currentViewYear.value
  const month = currentViewMonth.value
  const todayStr = getTodayString()

  // 当月第一天
  const firstDay = new Date(year, month, 1)
  // 周几 (0 是周日, 1 是周一... 转为周一为0, 周日为6)
  let firstDayOfWeek = firstDay.getDay() - 1
  if (firstDayOfWeek === -1) firstDayOfWeek = 6

  // 当月总天数
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
  // 上个月总天数
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells = []

  // 1. 上月填充
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const prevMonthIdx = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const dateStr = formatDayStr(prevYear, prevMonthIdx, day)
    const dayOfWeek = (firstDayOfWeek - 1 - i + 7) % 7
    cells.push({
      year: prevYear,
      month: prevMonthIdx,
      day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === props.modelValue,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6
    })
  }

  // 2. 当月日期
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = formatDayStr(year, month, d)
    const dayOfWeek = (firstDayOfWeek + d - 1) % 7
    cells.push({
      year,
      month,
      day: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === props.modelValue,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6
    })
  }

  // 3. 下月填充 (补满 42 格)
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    const dateStr = formatDayStr(nextYear, nextMonthIdx, d)
    const dayOfWeek = (cells.length) % 7
    cells.push({
      year: nextYear,
      month: nextMonthIdx,
      day: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === props.modelValue,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6
    })
  }

  return cells
})

function getTodayString() {
  const now = new Date()
  return formatDayStr(now.getFullYear(), now.getMonth(), now.getDate())
}

function toggleOpen() {
  if (props.disabled) return
  if (!isOpen.value) {
    initViewDate()
    isOpen.value = true
  } else {
    isOpen.value = false
  }
}

function closePopover() {
  isOpen.value = false
}

function changeMonth(delta) {
  let m = currentViewMonth.value + delta
  let y = currentViewYear.value
  if (m < 0) {
    m = 11
    y -= 1
  } else if (m > 11) {
    m = 0
    y += 1
  }
  currentViewMonth.value = m
  currentViewYear.value = y
}

function changeYear(delta) {
  currentViewYear.value += delta
}

function selectDate(cell) {
  if (cell.month !== currentViewMonth.value) {
    currentViewMonth.value = cell.month
    currentViewYear.value = cell.year
  }
  emit('update:modelValue', cell.dateStr)
  emit('change', cell.dateStr)
  closePopover()
}

function selectPreset(type) {
  const d = new Date()
  if (type === 'yesterday') {
    d.setDate(d.getDate() - 1)
  }
  const dateStr = formatDayStr(d.getFullYear(), d.getMonth(), d.getDate())
  currentViewYear.value = d.getFullYear()
  currentViewMonth.value = d.getMonth()
  emit('update:modelValue', dateStr)
  emit('change', dateStr)
  closePopover()
}

function handleClickOutside(e) {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    closePopover()
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    closePopover()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.custom-datepicker-container {
  position: relative;
  display: inline-block;
}

/* ── 触发器胶囊 ── */
.datepicker-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--glass-input);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 7px 12px;
  font-family: var(--font-sans);
  color: var(--text-primary);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--t-base);
  user-select: none;
  outline: none;
}

.datepicker-trigger:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.70);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.35);
}

.datepicker-trigger.active {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15), var(--shadow-sm);
}

.datepicker-trigger.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.trigger-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.trigger-icon svg {
  width: 15px;
  height: 15px;
}

.trigger-date-text {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.trigger-weekday-tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.12);
  padding: 1px 6px;
  border-radius: 4px;
}

.trigger-arrow {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  transition: transform var(--t-base);
  margin-left: 2px;
}

.trigger-arrow svg {
  width: 13px;
  height: 13px;
}

.trigger-arrow.is-open {
  transform: rotate(180deg);
  color: var(--color-primary);
}

/* ── 浮动毛玻璃日历弹窗 ── */
.datepicker-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 290px;
  background: rgba(255, 255, 255, 0.90);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-md);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14), 0 2px 10px rgba(99, 102, 241, 0.08);
  padding: var(--space-md);
  z-index: 1000;
  user-select: none;
}

/* ── 头部导航 ── */
.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.picker-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.nav-btn-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nav-arrow-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--t-fast);
  padding: 0;
}

.nav-arrow-btn svg {
  width: 14px;
  height: 14px;
}

.nav-arrow-btn:hover {
  background: rgba(99, 102, 241, 0.12);
  color: var(--color-primary);
}

/* ── 星期表头 ── */
.picker-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 4px;
}

.weekday-cell {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 4px 0;
}

.weekday-cell.weekend {
  color: #818cf8;
}

/* ── 日历网格 ── */
.picker-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-day-btn {
  position: relative;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--t-fast);
  padding: 0;
}

.calendar-day-btn:hover:not(.is-selected) {
  background: rgba(99, 102, 241, 0.12);
  color: var(--color-primary);
  transform: scale(1.05);
}

.calendar-day-btn.other-month {
  color: var(--text-muted);
  opacity: 0.35;
}

.calendar-day-btn.is-weekend:not(.is-selected):not(.other-month) {
  color: #4338ca;
}

.calendar-day-btn.is-today:not(.is-selected) {
  font-weight: 800;
  color: var(--color-primary);
}

.today-indicator {
  position: absolute;
  bottom: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-primary);
}

.calendar-day-btn.is-selected {
  background: var(--grad-primary);
  color: #ffffff !important;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.38);
  transform: scale(1.02);
}

/* ── 底部快捷栏 ── */
.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-sm);
  padding-top: var(--space-xs);
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.quick-links {
  display: flex;
  align-items: center;
  gap: 6px;
}

.quick-btn {
  background: transparent;
  border: none;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 4px;
  transition: all var(--t-fast);
}

.quick-btn:hover {
  background: rgba(99, 102, 241, 0.10);
  color: var(--color-primary);
}

.today-quick-btn {
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.08);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 4px;
  transition: all var(--t-fast);
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

/* ── 弹窗动画 ── */
.picker-pop-enter-active,
.picker-pop-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.picker-pop-enter-from,
.picker-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
</style>
