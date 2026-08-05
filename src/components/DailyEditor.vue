<template>
  <div class="editor-wrapper">
    <!-- 上方：原始记录输入卡片 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">
          <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          原始记录
        </span>
        <span class="text-muted" style="font-size:0.8rem">口语化随手记，AI 智能整理润色</span>
      </div>
      <div class="card-body">
        <div class="form-group" style="margin-bottom:0">
          <textarea
            id="daily-raw-input"
            v-model="store.current.raw"
            class="form-textarea raw-textarea"
            placeholder="今天完成了哪些工作？例如：1. 上午解决了用户登录失败的bug；2. 下午参与了新版本需求评审，确认了API字段；3. 编写了研发说明文档..."
            rows="6"
          ></textarea>
        </div>
      </div>
      <div class="card-footer">
        <button
          id="btn-ai-polish"
          class="btn btn-primary btn-lg"
          :disabled="!store.current.raw.trim() || store.polishing"
          @click="doPolish"
        >
          <span v-if="store.polishing" class="loading-spinner"></span>
          <svg v-else class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
          </svg>
          {{ store.polishing ? 'AI 润色思考中...' : 'AI 智能润色' }}
        </button>
        <span v-if="store.current.raw.length > 0" class="char-count">
          {{ store.current.raw.length }} 字
        </span>
      </div>
    </div>

    <!-- 下方：润色结果卡片 -->
    <div class="card result-card" :class="{ 'has-content': hasResult }">
      <div class="card-header">
        <span class="card-title">
          <svg class="header-icon text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          润色结果
        </span>
        <div v-if="hasResult" class="flex gap-sm items-center">
          <span class="badge badge-success">
            <svg class="badge-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
            已生成
          </span>
          <button id="btn-copy-daily" class="btn btn-secondary" @click="copyPolished">
            <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
            </svg>
            复制文案
          </button>
          <button id="btn-save-daily" class="btn btn-primary" :disabled="store.saving" @click="doSave">
            <span v-if="store.saving" class="loading-spinner"></span>
            <svg v-else class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
            </svg>
            {{ store.saving ? '保存中...' : '保存日报' }}
          </button>
        </div>
      </div>

      <!-- 流式生成中 -->
      <div v-if="store.polishing && store.polishStream" class="card-body">
        <div class="stream-output">
          <div class="stream-header">
            <span class="pulse-dot"></span>
            <span>AI 生成思想流...</span>
          </div>
          <div class="stream-cursor">{{ store.polishStream }}</div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!hasResult && !store.polishing" class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
        </svg>
        <div class="empty-state-title">等待 AI 智能生成</div>
        <div class="empty-state-desc">在上方的文本框记录今天的工作，点击「AI 智能润色」即可生成符合规范的结构化文案</div>
      </div>

      <!-- 结果编辑/渲染区 -->
      <div v-else-if="hasResult" class="card-body result-body">
        <!-- 标题 -->
        <div class="form-group">
          <label class="form-label" for="daily-title">
            <svg class="label-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 12h10M7 17h10"/>
            </svg>
            日报标题
          </label>
          <input
            id="daily-title"
            v-model="store.current.title"
            class="form-input title-input"
            placeholder="生成的标题（支持二次修改）"
          />
        </div>

        <!-- 润色文案 -->
        <div class="form-group" style="margin-bottom:0">
          <div class="flex justify-between items-center mb-xs">
            <label class="form-label" for="daily-polished" style="margin-bottom:0">
              <svg class="label-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              润色文案 (Markdown 格式)
            </label>
            <div class="flex gap-sm items-center">
              <button class="btn btn-ghost btn-sm" @click="copyPolished" title="复制当前文案">
                <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/>
                </svg>
                复制
              </button>
              <div class="tab-group">
                <button
                  class="tab-btn"
                  :class="{ active: viewMode === 'preview' }"
                  @click="viewMode = 'preview'"
                >
                  👁️ 渲染预览
                </button>
                <button
                  class="tab-btn"
                  :class="{ active: viewMode === 'edit' }"
                  @click="viewMode = 'edit'"
                >
                  ✏️ 源代码编辑
                </button>
              </div>
            </div>
          </div>

          <!-- 编辑视图 -->
          <textarea
            v-if="viewMode === 'edit'"
            id="daily-polished"
            v-model="store.current.polished"
            class="form-textarea polished-textarea"
            placeholder="AI 润色后的文案（数字序号格式，可手动编辑修改）"
            rows="10"
          ></textarea>

          <!-- 渲染视图 -->
          <div
            v-else
            class="markdown-body polished-preview"
            v-html="renderedMarkdown"
          ></div>
        </div>
      </div>

      <!-- 已保存提示 footer -->
      <div v-if="store.current.updatedAt" class="saved-tip">
        <svg class="saved-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>已于 {{ formatTime(store.current.updatedAt) }} 完成云端保存</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { marked } from 'marked'
import { useDailyStore } from '../stores/daily.js'
import { aiApi } from '../api/index.js'

const store = useDailyStore()
const showToast = inject('showToast')

const viewMode = ref('preview')

const hasResult = computed(() => !!(store.current.title || store.current.polished))

const renderedMarkdown = computed(() => {
  if (!store.current.polished) return ''
  return marked.parse(store.current.polished)
})

async function doPolish() {
  if (!store.current.raw.trim()) return

  store.polishing = true
  store.polishStream = ''
  store.current.title = ''
  store.current.polished = ''

  await aiApi.polish(store.current.raw, {
    onChunk: (text) => {
      store.polishStream += text
    },
    onDone: (result) => {
      store.polishing = false
      store.polishStream = ''
      if (result && result.title) store.current.title = result.title
      if (result && result.content) store.current.polished = result.content
    },
    onError: (err) => {
      store.polishing = false
      store.polishStream = ''
      showToast('润色失败：' + err.message, 'error')
    }
  })
}

async function doSave() {
  try {
    await store.saveCurrentDaily()
    showToast('日报保存成功！', 'success')
  } catch (e) {
    showToast('保存失败：' + e.message, 'error')
  }
}

async function copyPolished() {
  const textToCopy = store.current.polished
  if (!textToCopy) {
    showToast('无文案可复制', 'warning')
    return
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textToCopy)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    showToast('已成功复制 Markdown 文案到剪贴板！', 'success')
  } catch (err) {
    showToast('复制失败，请手动选择文本复制', 'error')
  }
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}
</script>

<style scoped>
.editor-wrapper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));
  gap: var(--space-xl);
  align-items: start;
}

@media (max-width: 960px) {
  .editor-wrapper {
    grid-template-columns: 1fr;
  }
}

.header-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary-light);
}

.label-svg {
  width: 16px;
  height: 16px;
  color: var(--color-primary-light);
}

.btn-svg-icon {
  width: 16px;
  height: 16px;
}

.badge-svg {
  width: 12px;
  height: 12px;
}

.raw-textarea {
  min-height: 320px;
  font-size: 0.92rem;
  line-height: 1.8;
}

.polished-textarea {
  min-height: 280px;
  line-height: 1.8;
  font-family: var(--font-sans);
}

.card-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  background: rgba(255, 255, 255, 0.4);
}

.char-count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.result-card {
  transition: all var(--transition-base);
}

.result-card.has-content {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.12);
}

.result-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.title-input {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 流式输出样式 */
.stream-output {
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  min-height: 120px;
}

.stream-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.8rem;
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pulse 1.5s infinite;
}

.stream-cursor {
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--color-text-primary);
  white-space: pre-wrap;
}

.stream-cursor::after {
  content: '▋';
  animation: blink 1s step-end infinite;
  color: var(--color-primary);
  font-size: 0.9em;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 页签切换按钮 */
.tab-group {
  display: flex;
  background: rgba(226, 232, 240, 0.6);
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: var(--radius-sm);
  padding: 2px;
  gap: 2px;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn.active {
  background: var(--grad-primary);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
}

.polished-preview {
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  min-height: 280px;
  color: var(--color-text-primary);
  font-size: 0.92rem;
  line-height: 1.9;
  box-shadow: inset 0 2px 6px rgba(15, 23, 42, 0.02);
}

.polished-preview :deep(ol) {
  padding-left: var(--space-xl);
  margin-bottom: var(--space-sm);
}

.polished-preview :deep(ol li) {
  margin-bottom: var(--space-sm);
  padding-left: var(--space-xs);
}

.polished-preview :deep(ol li::marker) {
  color: var(--color-primary);
  font-weight: 700;
}

.polished-preview :deep(p) {
  margin-bottom: var(--space-sm);
}

.polished-preview :deep(strong) {
  color: var(--color-primary-dark);
}

/* 已保存提示 */
.saved-tip {
  padding: var(--space-md) var(--space-lg);
  font-size: 0.8rem;
  color: var(--color-success);
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(16, 185, 129, 0.06);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.saved-svg {
  width: 14px;
  height: 14px;
}
</style>
