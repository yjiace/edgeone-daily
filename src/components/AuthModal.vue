<template>
  <!-- 鉴权遮罩层 -->
  <Transition name="auth-fade">
    <div v-if="visible" class="auth-overlay" @click.self="onOverlayClick">
      <div class="auth-modal" :class="{ 'shake': shaking }">
        <!-- 顶部装饰光晕 -->
        <div class="auth-modal-glow"></div>

        <!-- Logo 区 -->
        <div class="auth-header">
          <div class="auth-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 class="auth-title">访问验证</h2>
          <p class="auth-subtitle">请输入访问密码以继续使用</p>
        </div>

        <!-- 输入区 -->
        <div class="auth-body">
          <div class="auth-input-wrap" :class="{ 'error': errorMsg }">
            <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <input
              id="auth-password-input"
              ref="inputRef"
              v-model="password"
              :type="showPwd ? 'text' : 'password'"
              class="auth-input"
              placeholder="请输入访问密码"
              autocomplete="current-password"
              @keyup.enter="handleSubmit"
              @input="errorMsg = ''"
            />
            <button class="auth-eye-btn" type="button" @click="showPwd = !showPwd" title="显示/隐藏密码">
              <svg v-if="!showPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </div>

          <!-- 错误提示 -->
          <Transition name="err-slide">
            <div v-if="errorMsg" class="auth-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{{ errorMsg }}</span>
            </div>
          </Transition>

          <!-- 确认按钮 -->
          <button
            id="auth-submit-btn"
            class="auth-submit-btn"
            :class="{ 'loading': loading }"
            :disabled="loading || !password"
            @click="handleSubmit"
          >
            <span v-if="!loading" class="auth-btn-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              确认访问
            </span>
            <span v-else class="loading-spinner"></span>
          </button>
        </div>

        <!-- 底部说明 -->
        <div class="auth-footer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>密码验证通过后将永久记住，无需再次输入</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['success'])

const password = ref('')
const showPwd = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const shaking = ref(false)
const inputRef = ref(null)

// 弹窗出现时自动聚焦
watch(() => props.visible, (val) => {
  if (val) {
    password.value = ''
    errorMsg.value = ''
    showPwd.value = false
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

// 点击遮罩不关闭（强制鉴权）
function onOverlayClick() {}

async function handleSubmit() {
  if (loading.value || !password.value) return
  loading.value = true
  errorMsg.value = ''

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    })
    const data = await res.json()

    if (data.ok) {
      // 验证通过，存入 localStorage
      localStorage.setItem('auth_password', password.value)
      emit('success')
    } else {
      errorMsg.value = data.message || '密码错误，请重试'
      triggerShake()
      password.value = ''
      nextTick(() => inputRef.value?.focus())
    }
  } catch (e) {
    errorMsg.value = '网络错误，请稍后重试'
    triggerShake()
  } finally {
    loading.value = false
  }
}

function triggerShake() {
  shaking.value = true
  setTimeout(() => { shaking.value = false }, 500)
}
</script>

<style scoped>
/* ============================
   鉴权遮罩层
   ============================ */
.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  padding: 20px;
}

/* ============================
   弹窗卡片
   ============================ */
.auth-modal {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(30px) saturate(200%);
  -webkit-backdrop-filter: blur(30px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  box-shadow:
    0 32px 64px rgba(15, 23, 42, 0.2),
    0 8px 24px rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  overflow: hidden;
  animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.85) translateY(20px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* 震动动画 */
.auth-modal.shake {
  animation: modalShake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes modalShake {
  0%  { transform: translateX(0); }
  15% { transform: translateX(-10px); }
  30% { transform: translateX(9px); }
  45% { transform: translateX(-7px); }
  60% { transform: translateX(6px); }
  75% { transform: translateX(-4px); }
  90% { transform: translateX(3px); }
  100%{ transform: translateX(0); }
}

/* 顶部光晕装饰 */
.auth-modal-glow {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  height: 160px;
  background: radial-gradient(ellipse, rgba(99, 102, 241, 0.35) 0%, rgba(168, 85, 247, 0.2) 50%, transparent 80%);
  filter: blur(20px);
  pointer-events: none;
}

/* ============================
   头部区域
   ============================ */
.auth-header {
  padding: 40px 32px 28px;
  text-align: center;
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.06) 0%, transparent 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.auth-logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 12px 28px rgba(79, 70, 229, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.auth-logo svg {
  width: 32px;
  height: 32px;
  color: #fff;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.auth-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
}

/* ============================
   表单区域
   ============================ */
.auth-body {
  padding: 28px 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(248, 250, 252, 0.8);
  border: 1.5px solid rgba(203, 213, 225, 0.7);
  border-radius: 14px;
  transition: all 0.2s ease;
  overflow: hidden;
}

.auth-input-wrap:focus-within {
  background: rgba(255, 255, 255, 1);
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.auth-input-wrap.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.auth-input-icon {
  width: 18px;
  height: 18px;
  color: #94a3b8;
  flex-shrink: 0;
  margin-left: 14px;
  pointer-events: none;
}

.auth-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: #0f172a;
  padding: 14px 12px;
  font-family: inherit;
  letter-spacing: 0.02em;
}

.auth-input::placeholder {
  color: #94a3b8;
  letter-spacing: 0;
}

.auth-eye-btn {
  width: 40px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #94a3b8;
  transition: color 0.15s;
  padding: 0 10px;
}

.auth-eye-btn:hover { color: #475569; }
.auth-eye-btn svg {
  width: 18px;
  height: 18px;
}

/* 错误提示 */
.auth-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ef4444;
  font-size: 0.825rem;
  font-weight: 500;
  padding: 0 2px;
}

.auth-error svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* ============================
   确认按钮
   ============================ */
.auth-submit-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 22px rgba(79, 70, 229, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.auth-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 14px 30px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.auth-submit-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
}

.auth-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auth-btn-content svg {
  width: 18px;
  height: 18px;
}

/* loading spinner */
.auth-submit-btn .loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============================
   底部说明
   ============================ */
.auth-footer {
  padding: 14px 32px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 0.78rem;
  border-top: 1px solid rgba(226, 232, 240, 0.5);
}

.auth-footer svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: #a5b4fc;
}

/* ============================
   过渡动画
   ============================ */
.auth-fade-enter-active {
  transition: opacity 0.3s ease;
}
.auth-fade-leave-active {
  transition: opacity 0.25s ease;
}
.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
}

.err-slide-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.err-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.err-slide-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.err-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
