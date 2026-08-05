<template>
  <div class="monthly-table-wrapper">
    <table class="monthly-table">
      <colgroup>
        <col style="width:200px" />
        <col style="width:200px" />
        <col style="width:80px" />
        <col style="width:180px" />
        <col style="width:180px" />
        <col style="width:80px" />
        <col style="width:48px" />
      </colgroup>
      <thead>
        <tr>
          <th>计划工作内容/指标</th>
          <th>目标结果/指标描述</th>
          <th>权重(%)</th>
          <th>考核评分标准</th>
          <th>完成情况评价</th>
          <th>自我得分</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in store.rows" :key="index" class="data-row">
          <!-- 计划工作内容 -->
          <td>
            <textarea
              :id="`row-${index}-plan`"
              v-model="row.plan"
              class="cell-textarea"
              placeholder="工作内容/指标"
              rows="3"
            ></textarea>
          </td>
          <!-- 目标结果 -->
          <td>
            <textarea
              :id="`row-${index}-target`"
              v-model="row.target"
              class="cell-textarea"
              placeholder="目标结果描述"
              rows="3"
            ></textarea>
          </td>
          <!-- 权重 -->
          <td class="weight-cell">
            <input
              :id="`row-${index}-weight`"
              type="number"
              v-model.number="row.weight"
              class="cell-input weight-input"
              min="0"
              max="100"
              placeholder="0"
            />
            <span class="weight-pct">%</span>
          </td>
          <!-- 评分标准 -->
          <td>
            <textarea
              :id="`row-${index}-standard`"
              v-model="row.standard"
              class="cell-textarea"
              placeholder="评分标准"
              rows="3"
            ></textarea>
          </td>
          <!-- 完成情况 -->
          <td>
            <textarea
              :id="`row-${index}-completion`"
              v-model="row.completion"
              class="cell-textarea"
              placeholder="完成情况说明"
              rows="3"
            ></textarea>
          </td>
          <!-- 自我得分 -->
          <td class="score-cell">
            <input
              :id="`row-${index}-score`"
              type="number"
              v-model.number="row.score"
              class="cell-input score-input"
              min="0"
              max="100"
              placeholder="0"
            />
          </td>
          <!-- 删除 -->
          <td class="action-cell">
            <button
              :id="`btn-delete-row-${index}`"
              class="btn btn-icon btn-ghost delete-row-btn"
              @click="store.removeRow(index)"
              title="删除此行"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="2" class="total-label">合计</td>
          <td class="total-weight" :class="{
            'weight-ok': store.weightValid,
            'weight-bad': !store.weightValid && store.rows.length > 0
          }">
            {{ store.totalWeight }}%
          </td>
          <td colspan="3"></td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
import { useMonthlyStore } from '../stores/monthly.js'
const store = useMonthlyStore()
</script>

<style scoped>
.monthly-table-wrapper {
  overflow-x: auto;
  min-width: 100%;
}

.monthly-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.monthly-table th {
  background: rgba(255,255,255,0.03);
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 10px var(--space-md);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.monthly-table td {
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
  padding: var(--space-sm);
}

.data-row:hover {
  background: rgba(255,255,255,0.015);
}

.data-row:last-child td {
  border-bottom: none;
}

/* 单元格输入 */
.cell-textarea {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  padding: 6px 8px;
  resize: none;
  outline: none;
  line-height: 1.6;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.cell-textarea:hover {
  border-color: rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
}

.cell-textarea:focus {
  border-color: var(--color-primary);
  background: rgba(91,143,255,0.05);
  box-shadow: 0 0 0 2px var(--color-primary-glow);
}

.cell-input {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 6px 8px;
  outline: none;
  text-align: center;
  transition: all var(--transition-fast);
}

.cell-input:focus {
  border-color: var(--color-primary);
  background: rgba(91,143,255,0.05);
  box-shadow: 0 0 0 2px var(--color-primary-glow);
}

.weight-cell, .score-cell {
  position: relative;
}

.weight-cell {
  display: flex;
  align-items: center;
  padding-right: var(--space-sm);
}

.weight-input { flex: 1; }

.weight-pct {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  flex-shrink: 0;
  margin-left: 2px;
}

.action-cell {
  padding: var(--space-sm) var(--space-xs);
  vertical-align: middle;
}

.delete-row-btn {
  color: var(--color-text-muted);
  opacity: 0;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}

.data-row:hover .delete-row-btn {
  opacity: 1;
}

.delete-row-btn:hover {
  color: var(--color-danger) !important;
}

/* 合计行 */
.total-row {
  background: rgba(255,255,255,0.02);
}

.total-row td {
  border-bottom: none;
  padding: 10px var(--space-md);
}

.total-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.total-weight {
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
  transition: color var(--transition-fast);
}

.weight-ok  { color: var(--color-success); }
.weight-bad { color: var(--color-danger); }
</style>
