<template>
  <div class="editor-wrapper">
    <!-- 上方：原文输入区 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📝 原始记录</span>
        <span class="text-muted" style="font-size:0.8rem">口语化记录即可，AI 会自动润色</span>
      </div>
      <div class="card-body">
        <div class="form-group" style="margin-bottom:0">
          <textarea
            id="daily-raw-input"
            v-model="store.current.raw"
            class="form-textarea raw-textarea"
            placeholder="今天做了什么？可以口语化记录，比如：上午修了个登录的bug，下午和产品开需求会，晚上写了接口文档..."
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
          <span v-else>✨</span>
          {{ store.polishing ? 'AI 润色中...' : 'AI 润色' }}
        </button>
        <span v-if="store.current.raw.length > 0" class="char-count">
          {{ store.current.raw.length }} 字
        </span>
      </div>
    </div>

    <!-- 下方：润色结果区 -->
    <div class="card result-card" :class="{ 'has-content': hasResult }">
      <div class="card-header">
        <span class="card-title">✨ 润色结果</span>
        <div v-if="hasResult" class="flex gap-sm items-center">
          <span class="badge badge-success">已生成</span>
          <button id="btn-copy-daily" class="btn btn-secondary" @click="copyPolished">
            📋 复制文案
          </button>
          <button id="btn-save-daily" class="btn btn-primary" :disabled="store.saving" @click="doSave">
            <span v-if="store.saving" class="loading-spinner"></span>
            <span v-else>💾</span>
            {{ store.saving ? '保存中...' : '保存日报' }}
          </button>
        </div>
      </div>

      <!-- 生成中的流式输出 -->
      <div v-if="store.polishing && store.polishStream" class="card-body">
        <div class="stream-output">
          <div class="stream-cursor">{{ store.polishStream }}</div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!hasResult && !store.polishing" class="empty-state">
        <div class="empty-state-icon">🤖</div>
        <div class="empty-state-title">等待 AI 润色</div>
        <div class="empty-state-desc">在上方输入原始记录后，点击「AI 润色」生成正式文案</div>
      </div>

      <!-- 结果编辑区 -->
      <div v-else-if="hasResult" class="card-body result-body">
        <!-- 标题 -->
        <div class="form-group">
          <label class="form-label" for="daily-title">📌 标题</label>
          <input
            id="daily-title"
            v-model="store.current.title"
            class="form-input title-input"
            placeholder="生成的标题（可修改）"
          />
        </div>

        <!-- 润色文案 -->
        <div class="form-group" style="margin-bottom:0">
          <div class="flex justify-between items-center mb-xs">
            <label class="form-label" for="daily-polished" style="margin-bottom:0">📄 润色文案 (Markdown)</label>
            <div class="flex gap-sm items-center">
              <button class="btn btn-ghost btn-sm" @click="copyPolished" title="复制当前文案">
                📋 复制
              </button>
              <div class="tab-group">
                <button
                  class="tab-btn"
                  :class="{ active: viewMode === 'preview' }"
                  @click="viewMode = 'preview'"
                >
                  👁️ 预览
                </button>
                <button
                  class="tab-btn"
                  :class="{ active: viewMode === 'edit' }"
                  @click="viewMode = 'edit'"
                >
                  ✏️ 编辑
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
            placeholder="AI 润色后的文案（可修改，支持 Markdown 格式与列表换行）"
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

      <!-- 已保存提示 -->
      <div v-if="store.current.updatedAt" class="saved-tip">
        ✓ 已保存于 {{ formatTime(store.current.updatedAt) }}
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

const viewMode = ref('preview') // 'preview' | 'edit'

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
    showToast('日报已保存', 'success')
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
      // 兼容非 HTTPS 环境下剪贴板接口的回退实现
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    showToast('文案已复制到剪贴板！', 'success')
  } catch (err) {
    showToast('复制失败，请手动选择复制', 'error')
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
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.raw-textarea {
  min-height: 140px;
  font-size: 0.9rem;
}

.polished-textarea {
  min-height: 220px;
  line-height: 1.8;
}

.card-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.char-count {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.result-card {
  transition: border-color var(--transition-base);
}

.result-card.has-content {
  border-color: rgba(91,143,255,0.3);
}

.result-body {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.title-input {
  font-size: 1rem;
  font-weight: 600;
}

/* 流式输出样式 */
.stream-output {
  background: rgba(91,143,255,0.04);
  border: 1px solid rgba(91,143,255,0.15);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  min-height: 120px;
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
  background: rgba(255,255,255,0.05);
  border-radius: var(--radius-sm);
  padding: 2px;
  gap: 2px;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn.active {
  background: var(--color-primary-glow);
  color: var(--color-primary);
  font-weight: 600;
}

.polished-preview {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
  min-height: 220px;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  line-height: 1.8;
}

.polished-preview :deep(ul),
.polished-preview :deep(ol) {
  padding-left: var(--space-lg);
  margin-bottom: var(--space-sm);
}

.polished-preview :deep(li) {
  margin-bottom: var(--space-xs);
}

.polished-preview :deep(p) {
  margin-bottom: var(--space-sm);
}

.polished-preview :deep(strong) {
  color: var(--color-primary);
}

/* 已保存提示 */
.saved-tip {
  padding: var(--space-sm) var(--space-lg);
  font-size: 0.78rem;
  color: var(--color-success);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}
</style>
