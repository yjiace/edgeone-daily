<template>
  <div class="custom-monthpicker-container" :class="{ 'is-compact-mode': variant === 'compact' }" ref="containerRef">
    <!-- 触发器胶囊 -->
    <button
      type="button"
      class="monthpicker-trigger"
      :class="{
        active: isOpen,
        disabled: disabled,
        'is-compact': variant === 'compact'
      }"
      :disabled="disabled"
      @click="toggleOpen"
      title="选择月份"
      aria-label="打开月份选择器"
    >
      <span v-if="variant !== 'compact'" class="trigger-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </span>
      <span class="trigger-text">{{ currentLabel }}</span>
      <span class="trigger-arrow" :class="{ 'is-open': isOpen }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    </button>

    <!-- 下拉毛玻璃菜单 -->
    <Transition name="menu-pop">
      <div v-if="isOpen" class="monthpicker-dropdown" :class="{ 'is-compact-dropdown': variant === 'compact' }" @click.stop>
        <div class="dropdown-header">
          <span class="header-title">选择月份</span>
          <span class="header-hint">共 {{ options.length }} 个月份可选</span>
        </div>
        <div class="dropdown-list">
          <button
            v-for="opt in options"
            :key="opt.value"
            type="button"
            class="month-option-item"
            :class="{ 'is-selected': opt.value === modelValue }"
            @click="selectOption(opt)"
          >
            <div class="option-left">
              <span class="option-dot" :class="{ active: opt.value === modelValue }"></span>
              <span class="option-label">{{ opt.label }}</span>
            </div>
            <span v-if="opt.value === modelValue" class="option-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'default' // 'default' | 'compact'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const containerRef = ref(null)
const isOpen = ref(false)

const currentLabel = computed(() => {
  const found = props.options.find(o => o.value === props.modelValue)
  if (found) return found.label
  if (!props.modelValue) return '请选择月份'
  return props.modelValue.replace('-', ' 年 ') + ' 月'
})

function toggleOpen() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}

function selectOption(opt) {
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  closeDropdown()
}

function handleClickOutside(e) {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    closeDropdown()
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    closeDropdown()
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
.custom-monthpicker-container {
  position: relative;
  display: inline-block;
}

/* ── 触发器胶囊 ── */
.monthpicker-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--glass-input);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 7px 14px;
  height: 36px;
  box-sizing: border-box;
  font-family: var(--font-sans);
  color: var(--text-primary);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--t-base);
  user-select: none;
  outline: none;
}

.monthpicker-trigger:hover:not(.disabled):not(.is-compact) {
  background: rgba(255, 255, 255, 0.70);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.35);
}

.monthpicker-trigger.active:not(.is-compact) {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15), var(--shadow-sm);
}

.monthpicker-trigger.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* 紧凑内嵌模式（用于导航控制器内） */
.monthpicker-trigger.is-compact {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: calc(var(--radius-md) - 3px);
  padding: 0 8px;
  height: 28px;
  gap: 4px;
}

.monthpicker-trigger.is-compact:hover:not(.disabled) {
  background: rgba(99, 102, 241, 0.10) !important;
  color: var(--color-primary);
}

.monthpicker-trigger.is-compact.active {
  background: rgba(99, 102, 241, 0.16) !important;
  color: var(--color-primary);
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

.trigger-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

.monthpicker-trigger.is-compact .trigger-text {
  font-size: 0.825rem;
  font-weight: 700;
  letter-spacing: -0.01em;
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

.monthpicker-trigger.is-compact .trigger-arrow svg {
  width: 12px;
  height: 12px;
}

.trigger-arrow.is-open {
  transform: rotate(180deg);
  color: var(--color-primary);
}

/* ── 下拉浮动毛玻璃菜单 ── */
.monthpicker-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: rgba(255, 255, 255, 0.90);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-md);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14), 0 2px 10px rgba(99, 102, 241, 0.08);
  padding: 8px 6px;
  z-index: 1000;
  user-select: none;
}

.monthpicker-dropdown.is-compact-dropdown {
  right: 50%;
  transform: translateX(50%);
  top: calc(100% + 6px);
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 8px 10px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  margin-bottom: 4px;
}

.header-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}

.header-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.dropdown-list {
  max-height: 250px;
  overflow-y: auto;
  padding-right: 2px;
}

/* 优雅精致毛玻璃滚动条 */
.dropdown-list::-webkit-scrollbar {
  width: 5px;
}
.dropdown-list::-webkit-scrollbar-track {
  background: transparent;
}
.dropdown-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 4px;
}
.dropdown-list::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.5);
}

/* ── 列表选项 ── */
.month-option-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--t-fast);
  text-align: left;
  outline: none;
}

.month-option-item:hover {
  background: rgba(99, 102, 241, 0.10);
}

.month-option-item.is-selected {
  background: rgba(99, 102, 241, 0.14);
}

.option-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.5);
  transition: all var(--t-fast);
}

.option-dot.active {
  background: var(--color-primary);
  box-shadow: 0 0 6px rgba(99, 102, 241, 0.6);
}

.option-label {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
}

.month-option-item.is-selected .option-label {
  color: var(--color-primary);
  font-weight: 700;
}

.option-check {
  display: flex;
  align-items: center;
  color: var(--color-primary);
}

.option-check svg {
  width: 14px;
  height: 14px;
}

/* ── 动画过渡 ── */
.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

.is-compact-dropdown.menu-pop-enter-from,
.is-compact-dropdown.menu-pop-leave-to {
  opacity: 0;
  transform: translateX(50%) translateY(-6px) scale(0.97);
}
</style>
