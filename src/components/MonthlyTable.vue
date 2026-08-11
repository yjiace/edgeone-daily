<template>
  <div class="monthly-table-wrapper">
    <table class="monthly-table">
      <colgroup>
        <col style="width:100px" />
        <col style="width:48px" />
        <col style="width:195px" />
        <col style="width:215px" />
        <col style="width:85px" />
        <col style="width:270px" />
        <col style="width:175px" />
        <col style="width:90px" />
        <col style="width:40px" />
      </colgroup>
      <thead>
        <tr>
          <th>考核类型</th>
          <th>序号</th>
          <th>计划工作内容/指标</th>
          <th>目标结果/指标描述</th>
          <th>权重</th>
          <th>考核评分标准</th>
          <th>完成情况评价</th>
          <th>自评得分</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in store.rows" :key="index" class="data-row">
          <!-- 考核类型 -->
          <td v-if="index === 0" :rowspan="store.rows.length" class="category-cell">
            <div class="category-title">本月重点工作</div>
          </td>

          <!-- 序号 -->
          <td class="seq-cell">
            <span class="seq-num">{{ index + 1 }}</span>
          </td>

          <!-- 计划工作内容 -->
          <td>
            <textarea
              :id="`row-${index}-plan`"
              v-model="row.plan"
              class="cell-textarea"
              placeholder="计划工作内容/指标"
              rows="3"
            ></textarea>
          </td>

          <!-- 目标结果 -->
          <td>
            <textarea
              :id="`row-${index}-target`"
              v-model="row.target"
              class="cell-textarea"
              placeholder="目标结果/指标描述"
              rows="3"
            ></textarea>
          </td>

          <!-- 权重 -->
          <td class="weight-cell">
            <div class="weight-wrap">
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
            </div>
          </td>

          <!-- 考核评分标准 -->
          <td>
            <textarea
              :id="`row-${index}-standard`"
              v-model="row.standard"
              class="cell-textarea"
              placeholder="考核评分标准"
              rows="3"
            ></textarea>
          </td>

          <!-- 完成情况评价 -->
          <td>
            <textarea
              :id="`row-${index}-completion`"
              v-model="row.completion"
              class="cell-textarea"
              placeholder="完成情况评价"
              rows="3"
            ></textarea>
          </td>

          <!-- 自评得分 -->
          <td class="score-cell">
            <input
              :id="`row-${index}-score`"
              type="number"
              v-model.number="row.score"
              class="cell-input score-input"
              min="0"
              :max="row.weight || 100"
              placeholder="0"
              :title="`该项满分为 ${row.weight || 0} 分`"
            />
          </td>

          <!-- 删除 -->
          <td class="action-cell">
            <button
              :id="`btn-delete-row-${index}`"
              class="delete-row-btn"
              @click="store.removeRow(index)"
              title="删除此行"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4" class="total-label">合计</td>
          <td class="text-center text-muted">—</td>
          <td colspan="2"></td>
          <td class="total-score" :class="{ 'score-ok': store.scoreValid, 'score-bad': !store.scoreValid }">
            <span class="score-num">{{ store.totalScore }}</span>
          </td>
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
  font-size: 0.875rem;
}

/* ── 表头 ── */
.monthly-table th {
  background: rgba(255, 255, 255, 0.50);
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  padding: 12px 10px;
  text-align: center;
  border: none;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}

.monthly-table th:first-child { border-radius: 0; }

/* ── 单元格 ── */
.monthly-table td {
  border: none;
  vertical-align: middle;
  padding: 8px 10px;
}

/* ── 考核类型列 ── */
.category-cell {
  background: rgba(255, 255, 255, 0.40);
  text-align: center;
  color: var(--color-primary);
  writing-mode: vertical-lr;
  letter-spacing: 0.25em;
  font-size: 0.9rem;
  font-weight: 700;
  padding: var(--space-lg) var(--space-xs);
  border: none;
}

.category-title { margin: 0 auto; }

/* ── 序号 ── */
.seq-cell {
  text-align: center;
  padding: 8px 6px;
}

.seq-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.12);
  border: none;
  color: var(--color-primary-light);
  font-size: 0.75rem;
  font-weight: 700;
}

/* ── 数据行 hover ── */
.data-row:hover { background: rgba(255, 255, 255, 0.65); }

/* ── 文本域 ── */
.cell-textarea {
  width: 100%;
  min-height: 72px;
  background: rgba(255, 255, 255, 0.35);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  padding: 7px 8px;
  resize: vertical;
  outline: none;
  line-height: 1.65;
  transition: all var(--t-fast);
}

.cell-textarea::placeholder { color: var(--text-muted); opacity: 0.7; }

.cell-textarea:hover {
  background: rgba(255, 255, 255, 0.60);
}

.cell-textarea:focus {
  background: rgba(255, 255, 255, 0.80);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}

/* ── 数字输入 ── */
.cell-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.35);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 700;
  padding: 6px 4px;
  outline: none;
  text-align: center;
  transition: all var(--t-fast);
}

.cell-input:focus {
  background: rgba(255, 255, 255, 0.80);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}

/* 隐藏数字输入的上下箭头 */
.cell-input[type="number"]::-webkit-inner-spin-button,
.cell-input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.weight-cell { text-align: center; }

.weight-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.weight-input { width: 50px; }
.score-input  { width: 50px; }

.weight-pct {
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
}

/* ── 操作列 ── */
.action-cell { text-align: center; }

.delete-row-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  color: var(--text-muted);
  opacity: 0.3;
  transition: all var(--t-fast);
  padding: 0;
}

.delete-row-btn svg { width: 13px; height: 13px; }

.data-row:hover .delete-row-btn { opacity: 1; }

.delete-row-btn:hover {
  color: var(--color-danger) !important;
  background: rgba(220, 38, 38, 0.08);
  opacity: 1;
}

/* ── 合计行 ── */
.total-row {
  background: rgba(255, 255, 255, 0.40);
  font-weight: 700;
}

.total-row td {
  padding: 14px var(--space-md);
  border: none;
}

.total-label {
  font-weight: 700;
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: center;
}

.score-cell, .total-score { text-align: center; }

.total-score {
  font-size: 1.25rem;
  font-weight: 800;
}

.score-num {
  display: inline-block;
  padding: 2px 12px;
  border-radius: var(--radius-sm);
  border: none;
}

.score-ok .score-num {
  color: var(--color-success);
  background: rgba(5, 150, 105, 0.12);
  border: none;
}

.score-bad .score-num {
  color: var(--color-danger);
  background: rgba(220, 38, 38, 0.12);
  border: none;
}
</style>
