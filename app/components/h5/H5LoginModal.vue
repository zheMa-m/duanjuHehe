<script setup lang="ts">
/**
 * H5 登录弹窗组件
 *
 * 重构设计 (Modern Dark Cinema):
 * - 移动端底部弹出式 (Bottom Sheet)
 * - 玻璃拟态面板 (Glassmorphism)
 * - 统一 Cinema 暗色调 + 靛蓝强调
 * - 圆角 24px + 发丝边框
 * - Expo.out 缓动动画
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

watch(() => props.visible, (val) => {
  if (val) {
    currentMode.value = props.mode || 'login'
    errorMsg.value = ''
  }
})

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

const providerIcons: Record<string, string> = {
  google: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#ffffff" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`,
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-overlay">
      <div v-if="visible" class="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" @click.self="emit('close')">
        <!-- 遮罩层 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-md" />

        <!-- 弹窗面板 (Bottom Sheet on mobile, centered on desktop) -->
        <Transition name="modal-sheet" appear>
          <div class="relative w-full sm:max-w-[380px] sm:mx-4 bg-[#0a0a0c]/95 backdrop-blur-xl border border-white/[0.08] sm:rounded-3xl rounded-t-3xl shadow-2xl shadow-black/50 overflow-hidden">
            <!-- 拖拽指示条 (mobile) -->
            <div class="sm:hidden flex justify-center pt-3 pb-1">
              <div class="w-10 h-1 rounded-full bg-white/15" />
            </div>

            <div class="px-6 pt-4 pb-8 sm:pb-6">
              <!-- 头部 -->
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-[18px] font-bold text-white tracking-tight">
                  {{ currentMode === 'login' ? t('login.signIn') : currentMode === 'register' ? t('login.createAccount') : t('login.linkAccount') }}
                </h3>
                <button
                  class="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-all"
                  @click="emit('close')"
                >
                  <span class="i-lucide-x text-[14px]" />
                </button>
              </div>

              <!-- 错误提示 -->
              <Transition name="error-fade">
                <div v-if="errorMsg" class="mb-4 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/15">
                  <span class="text-[12px] text-rose-400">{{ errorMsg }}</span>
                </div>
              </Transition>

              <!-- 邮箱表单 -->
              <div class="space-y-3">
                <div v-if="currentMode === 'register'">
                  <label class="text-[11px] font-medium text-white/35 mb-1.5 block">{{ t('login.username') }}</label>
                  <input
                    v-model="username"
                    type="text"
                    :placeholder="t('login.usernamePlaceholder')"
                    class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-[#5E6AD2]/40 focus:bg-white/[0.06] transition-all duration-200"
                  />
                </div>
                <div>
                  <label class="text-[11px] font-medium text-white/35 mb-1.5 block">{{ t('login.email') }}</label>
                  <input
                    v-model="email"
                    type="email"
                    :placeholder="t('login.emailPlaceholder')"
                    class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-[#5E6AD2]/40 focus:bg-white/[0.06] transition-all duration-200"
                  />
                </div>
                <div>
                  <label class="text-[11px] font-medium text-white/35 mb-1.5 block">{{ t('login.password') }}</label>
                  <input
                    v-model="password"
                    type="password"
                    :placeholder="t('login.passwordPlaceholder')"
                    class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-[#5E6AD2]/40 focus:bg-white/[0.06] transition-all duration-200"
                  />
                </div>

                <!-- 主按钮 -->
                <button
                  v-if="currentMode === 'login'"
                  class="w-full font-bold text-[13px] py-3.5 rounded-2xl text-white bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] shadow-lg shadow-indigo-500/20 active:scale-[0.97] transition-all duration-200 mt-2"
                  :disabled="isLoading"
                  @click="handleEmailLogin"
                >
                  {{ isLoading ? t('login.signingIn') : t('login.signInWithEmail') }}
                </button>
                <button
                  v-else-if="currentMode === 'register'"
                  class="w-full font-bold text-[13px] py-3.5 rounded-2xl text-white bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] shadow-lg shadow-indigo-500/20 active:scale-[0.97] transition-all duration-200 mt-2"
                  :disabled="isLoading"
                  @click="handleEmailRegister"
                >
                  {{ isLoading ? t('login.creating') : t('login.createAccount') }}
                </button>
                <button
                  v-else
                  class="w-full font-bold text-[13px] py-3.5 rounded-2xl text-white bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] shadow-lg shadow-indigo-500/20 active:scale-[0.97] transition-all duration-200 mt-2"
                  :disabled="isLoading"
                  @click="handleAnonymousBind"
                >
                  {{ isLoading ? t('login.linking') : t('login.linkEmailAccount') }}
                </button>
              </div>

              <!-- 分割线 -->
              <div class="flex items-center gap-3 my-5">
                <div class="flex-1 h-px bg-white/[0.06]" />
                <span class="text-[11px] text-white/20">{{ t('login.orContinueWith') }}</span>
                <div class="flex-1 h-px bg-white/[0.06]" />
              </div>

              <!-- 社交登录 -->
              <div class="flex gap-3">
                <button
                  v-for="provider in (['google', 'facebook', 'apple'] as const)"
                  :key="provider"
                  class="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer active:scale-[0.97]"
                  :disabled="isLoading"
                  @click="handleOAuthLogin(provider)"
                >
                  <span v-html="providerIcons[provider]" class="inline-flex" />
                </button>
              </div>

              <!-- 切换模式 -->
              <div v-if="currentMode !== 'bind'" class="text-center mt-5">
                <span class="text-[12px] text-white/30">
                  <template v-if="currentMode === 'login'">
                    {{ t('login.dontHaveAccount') }}
                    <a href="#" @click.prevent="switchMode('register')" class="text-[#5E6AD2] font-semibold hover:text-[#5E6AD2]/80 transition-colors">{{ t('login.signUp') }}</a>
                  </template>
                  <template v-else>
                    {{ t('login.alreadyHaveAccount') }}
                    <a href="#" @click.prevent="switchMode('login')" class="text-[#5E6AD2] font-semibold hover:text-[#5E6AD2]/80 transition-colors">{{ t('login.signIn') }}</a>
                  </template>
                </span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 遮罩层动画 */
.modal-overlay-enter-active,
.modal-overlay-leave-active {
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-overlay-enter-from,
.modal-overlay-leave-to {
  opacity: 0;
}

/* 底部弹出面板动画 (Expo.out easing) */
.modal-sheet-enter-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-sheet-leave-active {
  transition: transform 0.3s cubic-bezier(0.7, 0, 0.84, 0);
}
.modal-sheet-enter-from {
  transform: translateY(100%);
}
.modal-sheet-leave-to {
  transform: translateY(100%);
}

/* 错误提示动画 */
.error-fade-enter-active,
.error-fade-leave-active {
  transition: all 0.2s ease;
}
.error-fade-enter-from,
.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 桌面端居中弹出 */
@media (min-width: 640px) {
  .modal-sheet-enter-from {
    transform: translateY(20px) scale(0.96);
    opacity: 0;
  }
  .modal-sheet-leave-to {
    transform: translateY(20px) scale(0.96);
    opacity: 0;
  }
}
</style>
