<template>
  <div class="monthly-table-wrapper">
    <table class="monthly-table">
      <colgroup>
        <col style="width:110px" />
        <col style="width:50px" />
        <col style="width:170px" />
        <col style="width:190px" />
        <col style="width:85px" />
        <col style="width:250px" />
        <col style="width:160px" />
        <col style="width:85px" />
        <col style="width:80px" />
        <col style="width:36px" />
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
          <th>考核得分</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in store.rows" :key="index" class="data-row">
          <!-- 考核类型（跨行合并） -->
          <td v-if="index === 0" :rowspan="store.rows.length" class="category-cell">
            <div class="category-title">本月重点工作</div>
          </td>

          <!-- 序号 -->
          <td class="seq-cell">{{ index + 1 }}</td>

          <!-- 计划工作内容/指标 -->
          <td>
            <textarea
              :id="`row-${index}-plan`"
              v-model="row.plan"
              class="cell-textarea"
              placeholder="计划工作内容/指标"
              rows="3"
            ></textarea>
          </td>

          <!-- 目标结果/指标描述 -->
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
            />
          </td>

          <!-- 考核得分 -->
          <td class="score-cell text-muted">
            <span class="placeholder-score">0</span>
          </td>

          <!-- 删除按键 -->
          <td class="action-cell">
            <button
              :id="`btn-delete-row-${index}`"
              class="btn btn-icon btn-ghost delete-row-btn"
              @click="store.removeRow(index)"
              title="删除此行"
            >
              ✕
            </button>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4" class="total-label text-center">合计</td>
          <td class="total-weight" :class="{
            'weight-ok': store.weightValid,
            'weight-bad': !store.weightValid
          }">
            {{ store.totalWeight }}%
          </td>
          <td colspan="2"></td>
          <td class="total-score" :class="{
            'score-ok': store.scoreValid,
            'score-bad': !store.scoreValid
          }">
            {{ store.totalScore }}
          </td>
          <td class="total-score text-muted">0</td>
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
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-muted);
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  padding: 12px var(--space-sm);
  text-align: center;
  border: 1px solid rgba(226, 232, 240, 0.2);
  white-space: nowrap;
}

.monthly-table td {
  border: 1px solid rgba(226, 232, 240, 0.15);
  vertical-align: middle;
  padding: var(--space-xs);
}

.category-cell {
  background: rgba(99, 102, 241, 0.05);
  text-align: center;
  font-weight: 700;
  color: var(--color-primary-light);
  writing-mode: vertical-lr;
  letter-spacing: 0.2em;
  font-size: 0.95rem;
  padding: var(--space-md) var(--space-xs);
}

.category-title {
  margin: 0 auto;
}

.seq-cell {
  text-align: center;
  font-weight: 600;
  color: var(--color-text-muted);
}

.data-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

/* 单元格文本域 */
.cell-textarea {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  padding: 6px 8px;
  resize: vertical;
  outline: none;
  line-height: 1.6;
  transition: all var(--transition-fast);
}

.cell-textarea:hover {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.cell-textarea:focus {
  border-color: var(--color-primary);
  background: rgba(99, 102, 241, 0.08);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
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
  padding: 6px 4px;
  outline: none;
  text-align: center;
  transition: all var(--transition-fast);
}

.cell-input:focus {
  border-color: var(--color-primary);
  background: rgba(99, 102, 241, 0.08);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.weight-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.weight-input {
  width: 50px;
}

.score-input {
  width: 50px;
}

.weight-pct {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.placeholder-score {
  display: block;
  text-align: center;
  font-weight: 600;
}

.action-cell {
  text-align: center;
}

.delete-row-btn {
  color: var(--color-text-muted);
  opacity: 0.4;
  font-size: 0.8rem;
  padding: 2px 6px;
  transition: all var(--transition-fast);
}

.data-row:hover .delete-row-btn {
  opacity: 1;
}

.delete-row-btn:hover {
  color: #ef4444 !important;
}

/* 合计行 */
.total-row {
  background: rgba(255, 255, 255, 0.03);
  font-weight: 700;
}

.total-row td {
  padding: 12px var(--space-md);
  border-top: 2px solid rgba(226, 232, 240, 0.3);
}

.total-label {
  font-weight: 700;
  color: var(--color-text-primary);
  font-size: 0.9rem;
}

.total-weight, .total-score {
  font-size: 1.1rem;
  font-weight: 800;
  text-align: center;
}

.weight-ok, .score-ok  { color: #10b981; }
.weight-bad, .score-bad { color: #ef4444; }
</style>
