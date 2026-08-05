<template>
  <div class="monthly-table-wrapper">
    <table class="monthly-table">
      <colgroup>
        <col style="width:110px" />
        <col style="width:55px" />
        <col style="width:200px" />
        <col style="width:220px" />
        <col style="width:90px" />
        <col style="width:280px" />
        <col style="width:180px" />
        <col style="width:100px" />
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

          <!-- 自评得分 (上限为该行的 weight 满分) -->
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

          <!-- 删除按键 -->
          <td class="action-cell">
            <button
              :id="`btn-delete-row-${index}`"
              class="btn btn-icon btn-ghost delete-row-btn"
              @click="store.removeRow(index)"
              title="删除此行"
            >
              <svg class="delete-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4" class="total-label text-center">合计</td>
          <td class="text-center text-muted">-</td>
          <td colspan="2"></td>
          <td class="total-score" :class="{
            'score-ok': store.scoreValid,
            'score-bad': !store.scoreValid
          }">
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
  font-size: 0.88rem;
}

.monthly-table th {
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-muted);
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  padding: 12px 10px;
  text-align: center;
  border: 1px solid rgba(226, 232, 240, 0.2);
  white-space: nowrap;
}

.monthly-table td {
  border: 1px solid rgba(226, 232, 240, 0.15);
  vertical-align: middle;
  padding: 8px 10px;
}

.category-cell {
  background: rgba(99, 102, 241, 0.05);
  text-align: center;
  font-weight: 700;
  color: var(--color-primary-light);
  writing-mode: vertical-lr;
  letter-spacing: 0.2em;
  font-size: 1rem;
  padding: var(--space-lg) var(--space-xs);
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

/* 单元格文本域：高度舒展大方 */
.cell-textarea {
  width: 100%;
  min-height: 72px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 0.88rem;
  padding: 8px 10px;
  resize: vertical;
  outline: none;
  line-height: 1.6;
  transition: all var(--transition-fast);
}

.cell-textarea:hover {
  border-color: rgba(255, 255, 255, 0.12);
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
  font-size: 0.95rem;
  font-weight: 700;
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
  width: 55px;
}

.score-input {
  width: 55px;
}

.weight-pct {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.action-cell {
  text-align: center;
}

.delete-row-btn {
  color: var(--color-text-muted);
  opacity: 0.4;
  font-size: 0.85rem;
  padding: 4px 8px;
  transition: all var(--transition-fast);
}

.delete-svg {
  width: 14px;
  height: 14px;
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
  padding: 14px var(--space-md);
  border-top: 2px solid rgba(226, 232, 240, 0.3);
}

.total-label {
  font-weight: 700;
  color: var(--color-text-primary);
  font-size: 0.95rem;
}

.total-score {
  font-size: 1.2rem;
  font-weight: 800;
  text-align: center;
}

.score-ok  { color: #10b981; }
.score-bad { color: #ef4444; }
</style>
