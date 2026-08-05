<template>
  <Transition name="weight-alert">
    <div v-if="store.rows.length > 0 && !store.weightValid" class="weight-alert">
      <span class="weight-alert-icon">⚠️</span>
      <span>
        当前权重合计 <strong>{{ store.totalWeight }}%</strong>，
        {{ store.totalWeight < 100 ? `还差 ${100 - store.totalWeight}%` : `超出 ${store.totalWeight - 100}%` }}，
        请调整各项权重使合计等于 100%
      </span>
    </div>
    <div v-else-if="store.rows.length > 0 && store.weightValid" class="weight-ok-tip">
      <span>✓</span> 权重合计 100%
    </div>
  </Transition>
</template>

<script setup>
import { useMonthlyStore } from '../stores/monthly.js'
const store = useMonthlyStore()
</script>

<style scoped>
.weight-alert {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px var(--space-md);
  background: rgba(251,191,36,0.1);
  border: 1px solid rgba(251,191,36,0.3);
  border-radius: var(--radius-sm);
  color: var(--color-warning);
  font-size: 0.82rem;
  line-height: 1.4;
}

.weight-alert strong {
  font-weight: 700;
}

.weight-alert-icon {
  flex-shrink: 0;
}

.weight-ok-tip {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 6px var(--space-md);
  background: rgba(52,211,153,0.08);
  border: 1px solid rgba(52,211,153,0.2);
  border-radius: var(--radius-sm);
  color: var(--color-success);
  font-size: 0.82rem;
  font-weight: 500;
}

.weight-alert-enter-active,
.weight-alert-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.weight-alert-enter-from,
.weight-alert-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
