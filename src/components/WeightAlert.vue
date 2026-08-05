<template>
  <Transition name="weight-alert">
    <div v-if="store.rows.length > 0" class="flex gap-sm items-center">
      <!-- 任务数提示 -->
      <div v-if="!store.rowCountValid" class="alert-chip alert-warning">
        <span>⚠️ 任务数需 ≥ 2 条</span>
      </div>

      <!-- 权重提示 -->
      <div v-if="!store.weightValid" class="alert-chip alert-warning">
        <span>⚠️ 权重 {{ store.totalWeight }}% (需=100%)</span>
      </div>
      <div v-else class="alert-chip alert-success">
        <span>✓ 权重 100%</span>
      </div>

      <!-- 自评得分提示 -->
      <div v-if="!store.scoreValid" class="alert-chip alert-warning">
        <span>⚠️ 自评总分 {{ store.totalScore }} 分 (需 > 90分)</span>
      </div>
      <div v-else class="alert-chip alert-success">
        <span>✓ 自评总分 {{ store.totalScore }} 分</span>
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
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.alert-warning {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.alert-success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #10b981;
}

.weight-alert-enter-active,
.weight-alert-leave-active {
  transition: all 0.2s ease;
}

.weight-alert-enter-from,
.weight-alert-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
