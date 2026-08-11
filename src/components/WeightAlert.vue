<template>
  <Transition name="weight-alert">
    <div v-if="store.rows.length > 0" class="flex gap-sm items-center flex-wrap">
      <!-- 任务数 -->
      <div v-if="!store.rowCountValid" class="alert-chip alert-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>任务数需 ≥ 2 条</span>
      </div>

      <!-- 权重 -->
      <div v-if="!store.weightValid" class="alert-chip alert-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>权重 {{ store.totalWeight }}% / 100%</span>
      </div>
      <div v-else class="alert-chip alert-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        <span>权重 100%</span>
      </div>

      <!-- 得分 -->
      <div v-if="!store.scoreValid" class="alert-chip alert-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>总分 {{ store.totalScore }} / 需 >90</span>
      </div>
      <div v-else class="alert-chip alert-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        <span>总分 {{ store.totalScore }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useMonthlyStore } from '../stores/monthly.js'
const store = useMonthlyStore()
</script>

<style scoped>
.alert-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.alert-chip svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.alert-warning {
  background: rgba(255, 255, 255, 0.5);
  /* border: 1px solid rgba(217, 119, 6, 0.25); */
  color: var(--color-warning);
}

.alert-success {
  background: rgba(5, 150, 105, 0.08);
  border: 1px solid rgba(5, 150, 105, 0.22);
  color: var(--color-accent);
}

.weight-alert-enter-active,
.weight-alert-leave-active { transition: all 0.2s ease; }
.weight-alert-enter-from,
.weight-alert-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
