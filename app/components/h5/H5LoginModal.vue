<script setup lang="ts">
/**
 * H5 登录弹窗组件
 *
 * 支持：Email 登录/注册 + Google/Facebook/Apple OAuth + 匿名绑定
 * 适配移动端竖屏布局
 */

const props = defineProps<{
  visible: boolean
  mode?: 'login' | 'register' | 'bind'
}>()

const emit = defineEmits<{
  close: []
  success: [user: any]
}>()

const { signInWithEmail, signUpWithEmail, signInWithOAuth, linkAnonymousToEmail } = useAuth()
const { t } = useI18n()

const currentMode = ref<'login' | 'register' | 'bind'>(props.mode || 'login')
const email = ref('')
const password = ref('')
const username = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

// 监听 visible 变化
watch(() => props.visible, (val) => {
  if (val) {
    currentMode.value = props.mode || 'login'
    errorMsg.value = ''
  }
})

// 邮箱登录
async function handleEmailLogin() {
  if (!email.value || !password.value) {
    errorMsg.value = t('login.enterEmailPassword')
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  try {
    const res = await signInWithEmail(email.value, password.value)
    emit('success', res)
    emit('close')
  } catch (err: any) {
    errorMsg.value = err?.data?.message || err?.message || t('login.loginFailed')
  } finally {
    isLoading.value = false
  }
}

// 邮箱注册
async function handleEmailRegister() {
  if (!email.value || !password.value) {
    errorMsg.value = t('login.enterEmailPassword')
    return
  }
  if (password.value.length < 8) {
    errorMsg.value = t('login.passwordMinLength')
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  try {
    const res = await signUpWithEmail(email.value, password.value, username.value || undefined)
    emit('success', res)
    emit('close')
  } catch (err: any) {
    errorMsg.value = err?.data?.message || err?.message || t('login.registerFailed')
  } finally {
    isLoading.value = false
  }
}

// 社交 OAuth 登录
async function handleOAuthLogin(provider: 'google' | 'facebook' | 'apple') {
  isLoading.value = true
  errorMsg.value = ''
  try {
    await signInWithOAuth(provider)
  } catch (err: any) {
    errorMsg.value = err?.data?.message || err?.message || `${provider} login failed`
    isLoading.value = false
  }
}

// 匿名绑定
async function handleAnonymousBind() {
  if (!email.value || !password.value) {
    errorMsg.value = t('login.enterEmailPassword')
    return
  }
  if (password.value.length < 8) {
    errorMsg.value = t('login.passwordMinLength')
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  try {
    const res = await linkAnonymousToEmail(email.value, password.value)
    emit('success', res)
    emit('close')
  } catch (err: any) {
    errorMsg.value = err?.data?.message || err?.message || t('login.linkFailed')
  } finally {
    isLoading.value = false
  }
}

function switchMode(mode: 'login' | 'register') {
  currentMode.value = mode
  errorMsg.value = ''
}

// Provider 图标 SVG（简洁内联）
const providerIcons: Record<string, string> = {
  google: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#ffffff" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`,
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="login-overlay" @click.self="emit('close')">
      <div class="login-modal">
        <!-- 头部 -->
        <div class="modal-header">
          <h3 v-if="currentMode === 'login'">{{ t('login.signIn') }}</h3>
          <h3 v-else-if="currentMode === 'register'">{{ t('login.createAccount') }}</h3>
          <h3 v-else>{{ t('login.linkAccount') }}</h3>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <!-- 邮箱表单 -->
        <div class="form-section">
          <div v-if="currentMode === 'register'" class="input-group">
            <label>{{ t('login.username') }}</label>
            <input v-model="username" type="text" :placeholder="t('login.usernamePlaceholder')" />
          </div>
          <div class="input-group">
            <label>{{ t('login.email') }}</label>
            <input v-model="email" type="email" :placeholder="t('login.emailPlaceholder')" />
          </div>
          <div class="input-group">
            <label>{{ t('login.password') }}</label>
            <input v-model="password" type="password" :placeholder="t('login.passwordPlaceholder')" />
          </div>

          <!-- 主按钮 -->
          <button
            v-if="currentMode === 'login'"
            class="primary-btn"
            :disabled="isLoading"
            @click="handleEmailLogin"
          >
            {{ isLoading ? t('login.signingIn') : t('login.signInWithEmail') }}
          </button>
          <button
            v-else-if="currentMode === 'register'"
            class="primary-btn"
            :disabled="isLoading"
            @click="handleEmailRegister"
          >
            {{ isLoading ? t('login.creating') : t('login.createAccount') }}
          </button>
          <button
            v-else
            class="primary-btn"
            :disabled="isLoading"
            @click="handleAnonymousBind"
          >
            {{ isLoading ? t('login.linking') : t('login.linkEmailAccount') }}
          </button>
        </div>

        <!-- 分割线 -->
        <div class="divider">
          <span>{{ t('login.orContinueWith') }}</span>
        </div>

        <!-- 社交登录 -->
        <div class="social-section">
          <button
            v-for="provider in (['google', 'facebook', 'apple'] as const)"
            :key="provider"
            class="social-btn"
            :disabled="isLoading"
            @click="handleOAuthLogin(provider)"
          >
            <span v-html="providerIcons[provider]" class="provider-icon" />
            <span>{{ provider.charAt(0).toUpperCase() + provider.slice(1) }}</span>
          </button>
        </div>

        <!-- 切换模式 -->
        <div v-if="currentMode !== 'bind'" class="switch-mode">
          <span v-if="currentMode === 'login'">
            {{ t('login.dontHaveAccount') }}
            <a href="#" @click.prevent="switchMode('register')">{{ t('login.signUp') }}</a>
          </span>
          <span v-else>
            {{ t('login.alreadyHaveAccount') }}
            <a href="#" @click.prevent="switchMode('login')">{{ t('login.signIn') }}</a>
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.login-overlay {
  position: fixed; inset: 0;
  background: rgba(2, 6, 23, 0.7); backdrop-filter: blur(8px);
  z-index: 9999; display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.login-modal {
  background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px;
  max-width: 360px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  padding: 2rem; color: #f8fafc;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.modal-header h3 { font-size: 1.15rem; font-weight: 700; margin: 0; color: #f8fafc; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; padding: 0.25rem; }
.close-btn:hover { color: #fff; }

.error-msg {
  background: rgba(239, 68, 68, 0.1); color: #fca5a5; padding: 0.65rem; border-radius: 8px;
  font-size: 0.8rem; margin-bottom: 1rem; border: 1px solid rgba(239, 68, 68, 0.2);
}

.form-section { display: flex; flex-direction: column; gap: 0.85rem; }
.input-group { display: flex; flex-direction: column; gap: 0.35rem; }
.input-group label { font-size: 0.75rem; font-weight: 600; color: #94a3b8; }
.input-group input {
  padding: 0.65rem 0.85rem; border: 1.5px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
  font-size: 0.85rem; outline: none; transition: all 0.2s; background: rgba(2, 6, 23, 0.4); color: #fff;
}
.input-group input:focus { border-color: #6366f1; background: rgba(2, 6, 23, 0.6); }

.primary-btn {
  background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff;
  padding: 0.75rem; border: none; border-radius: 8px; font-size: 0.85rem;
  font-weight: 600; cursor: pointer; transition: opacity 0.2s;
  margin-top: 0.5rem;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
}
.primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.primary-btn:not(:disabled):hover { opacity: 0.9; }

.divider {
  display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0;
  color: #475569; font-size: 0.75rem;
}
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255, 255, 255, 0.08); }

.social-section { display: flex; flex-direction: column; gap: 0.65rem; }
.social-btn {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.65rem; border: 1.5px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
  background: rgba(255, 255, 255, 0.02); cursor: pointer; font-size: 0.85rem; font-weight: 500;
  transition: all 0.2s; color: #f1f5f9;
}
.social-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.social-btn:not(:disabled):hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.15); }
.provider-icon { display: flex; align-items: center; }

.switch-mode {
  text-align: center; margin-top: 1.25rem; font-size: 0.8rem; color: #94a3b8;
}
.switch-mode a { color: #818cf8; font-weight: 600; text-decoration: none; }
.switch-mode a:hover { text-decoration: underline; }
</style>
