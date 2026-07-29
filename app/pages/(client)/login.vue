<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

const { t } = useI18n()
const { user, isLoggedIn, signInWithEmail, signUpWithEmail, initAuth } = useAuth()

definePageMeta({ ssr: false })

const activeTab = ref<'login' | 'register'>('login')
const loading = ref(false)
const errorMsg = ref('')
const touched = reactive({ username: false, email: false, password: false })

const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ email: '', password: '', username: '' })

// 校验规则
const emailHint = computed(() => {
  if (!registerForm.email && !touched.email) return ''
  return registerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email) ? '请输入有效的邮箱地址' : ''
})
const passwordHint = computed(() => {
  if (!registerForm.password && !touched.password) return '至少 8 位字符'
  return registerForm.password && registerForm.password.length < 8 ? `还需要 ${8 - registerForm.password.length} 位` : ''
})
const usernameHint = computed(() => {
  if (!registerForm.username && !touched.username) return '至少 2 位字符'
  return registerForm.username && registerForm.username.length < 2 ? '用户名至少 2 位' : ''
})

function markTouched(field: string) {
  (touched as any)[field] = true
}

// 已登录则重定向
onMounted(async () => {
  await initAuth()
  if (isLoggedIn.value) {
    navigateTo('/coins')
  }
})

async function handleLogin() {
  errorMsg.value = ''
  if (!loginForm.email || !loginForm.password) {
    errorMsg.value = '请填写邮箱和密码'
    return
  }
  loading.value = true
  try {
    await signInWithEmail(loginForm.email, loginForm.password)
    navigateTo('/coins')
  } catch (e: any) {
    errorMsg.value = e.statusMessage || e.message || t('common.error')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  errorMsg.value = ''
  touched.username = true; touched.email = true; touched.password = true

  if (!registerForm.email || !registerForm.password || !registerForm.username) {
    errorMsg.value = '请填写完整信息'
    return
  }
  if (registerForm.username.length < 2 || registerForm.password.length < 8) {
    errorMsg.value = '请修正下方红色提示的字段'
    return
  }
  loading.value = true
  try {
    await signUpWithEmail(registerForm.email, registerForm.password, registerForm.username || undefined)
    navigateTo('/coins')
  } catch (e: any) {
    errorMsg.value = e.statusMessage || e.message || t('common.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-root">
    <header class="login-header">
      <NuxtLink to="/" class="back-link">← {{ $t('reelshort.siteName') }}</NuxtLink>
    </header>

    <div class="login-card">
      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'login' }"
          @click="activeTab = 'login'"
        >{{ $t('reelshort.signIn') }}</button>
        <button
          class="tab"
          :class="{ active: activeTab === 'register' }"
          @click="activeTab = 'register'"
        >{{ $t('reelshort.signUp') }}</button>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <!-- Login Form -->
      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="form">
        <label class="field">
          <span class="field-label">{{ $t('reelshort.email') }}</span>
          <input v-model="loginForm.email" type="email" class="input" placeholder="you@example.com" autocomplete="email" />
        </label>
        <label class="field">
          <span class="field-label">{{ $t('reelshort.password') }}</span>
          <input v-model="loginForm.password" type="password" class="input" placeholder="至少 8 位字符" autocomplete="current-password" />
          <span class="hint">至少 8 位字符</span>
        </label>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '...' : $t('reelshort.signIn') }}
        </button>
        <p class="switch-text">
          {{ $t('reelshort.noAccount') }}
          <button type="button" class="link-btn" @click="activeTab = 'register'">{{ $t('reelshort.signUp') }}</button>
        </p>
      </form>

      <!-- Register Form -->
      <form v-else @submit.prevent="handleRegister" class="form">
        <label class="field">
          <span class="field-label">{{ $t('reelshort.username') }}</span>
          <input
            v-model="registerForm.username"
            type="text"
            class="input"
            :class="{ 'input-error': touched.username && registerForm.username.length < 2 }"
            placeholder="至少 2 位字符"
            autocomplete="name"
            @blur="markTouched('username')"
          />
          <span class="hint" :class="{ 'hint-error': touched.username && registerForm.username.length < 2 }">
            {{ touched.username && registerForm.username && registerForm.username.length >= 2 ? '✅ 可用' : '至少 2 位字符' }}
          </span>
        </label>
        <label class="field">
          <span class="field-label">{{ $t('reelshort.email') }}</span>
          <input
            v-model="registerForm.email"
            type="email"
            class="input"
            :class="{ 'input-error': touched.email && registerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email) }"
            placeholder="you@example.com"
            autocomplete="email"
            @blur="markTouched('email')"
          />
          <span class="hint" :class="{ 'hint-error': touched.email && registerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email) }">
            {{ touched.email && registerForm.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email) ? '✅ 格式正确' : '请输入有效的邮箱地址' }}
          </span>
        </label>
        <label class="field">
          <span class="field-label">{{ $t('reelshort.password') }}</span>
          <input
            v-model="registerForm.password"
            type="password"
            class="input"
            :class="{ 'input-error': touched.password && registerForm.password.length < 8 }"
            placeholder="至少 8 位字符"
            autocomplete="new-password"
            @blur="markTouched('password')"
          />
          <span class="hint" :class="{ 'hint-error': touched.password && registerForm.password.length < 8 }">
            {{ touched.password && registerForm.password.length >= 8 ? '✅ 可用' : touched.password && registerForm.password.length > 0 ? `还需要 ${8 - registerForm.password.length} 位` : '至少 8 位字符' }}
          </span>
        </label>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '...' : $t('reelshort.signUp') }}
        </button>
        <p class="switch-text">
          {{ $t('reelshort.hasAccount') }}
          <button type="button" class="link-btn" @click="activeTab = 'login'">{{ $t('reelshort.signIn') }}</button>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-root {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--font-sans);
}
.login-header {
  width: 100%;
  max-width: 440px;
  padding: 24px 24px 0;
}
.back-link {
  color: #6366f1;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}
.login-card {
  margin-top: 40px;
  width: 100%;
  max-width: 440px;
  padding: 32px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
}
.tab {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.tab.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.input {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #0f172a;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}
.input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}
.input-error {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important;
}
.input::placeholder {
  color: #94a3b8;
}

.hint {
  font-size: 11px;
  color: #94a3b8;
  min-height: 16px;
}
.hint-error {
  color: #ef4444;
}

.submit-btn {
  margin-top: 4px;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(99,102,241,0.25);
  transition: all 0.2s;
  font-family: inherit;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(99,102,241,0.35);
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-text {
  text-align: center;
  font-size: 13px;
  color: #64748b;
  margin-top: 8px;
}
.link-btn {
  background: none;
  border: none;
  color: #6366f1;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
}
.link-btn:hover {
  text-decoration: underline;
}

.error-msg {
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  border: 1px solid #fecaca;
}

@media (max-width: 480px) {
  .login-card {
    margin-top: 24px;
    padding: 24px 20px;
    border-radius: 12px;
  }
}
</style>
