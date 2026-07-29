<script setup lang="ts">
const emit = defineEmits<{
  login: [username: string, password: string]
}>()

const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')
const showPassword = ref(false)
const submitting = ref(false)

const handleLogin = () => {
  loginError.value = ''
  if (!loginUsername.value || !loginPassword.value) {
    loginError.value = '请输入账号和密码'
    return
  }
  submitting.value = true
  emit('login', loginUsername.value, loginPassword.value)
}

const showError = (msg: string) => {
  loginError.value = msg
  submitting.value = false
}

defineExpose({ showError })
</script>

<template>
  <div
    class="login-root"
    style="flex:1;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px 16px;position:relative;z-index:20"
  >

    <!-- 卡片主体 -->
    <div
      class="login-card"
      style="position:relative;width:100%;max-width:400px;padding:40px 36px;border-radius:12px;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.10)"
    >

      <!-- 顶部品牌区 -->
      <div class="login-brand" style="text-align:center;margin-bottom:32px">
        <div class="login-logo" style="width:52px;height:52px;border-radius:10px;background:#6366f1;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
          <span class="login-logo__letter" style="font-size:22px;font-weight:700;color:#fff">H</span>
        </div>
        <h1 class="login-title" style="font-size:20px;font-weight:700;color:#fff;margin:0 0 6px">管理后台</h1>
        <p class="login-subtitle" style="font-size:13px;color:rgba(0,0,0,0.35);margin:0">请使用管理员账号登录以继续操作</p>
      </div>

      <!-- 登录表单 -->
      <form @submit.prevent="handleLogin" class="login-form" style="display:flex;flex-direction:column;gap:18px">

        <!-- 错误提示 -->
        <Transition name="login-error-fade">
          <div v-if="loginError" class="login-error" role="alert" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;font-size:13px;color: #dc2626;background:rgba(255,69,58,0.08);border:1px solid rgba(255,69,58,0.18)">
            <span class="i-lucide-circle-alert text-[14px] flex-shrink-0" />
            <span>{{ loginError }}</span>
          </div>
        </Transition>

        <!-- 账号 -->
        <div class="login-field" style="display:flex;flex-direction:column;gap:7px">
          <label class="login-label" for="login-username" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:rgba(0,0,0,0.28);padding-left:2px">账号</label>
          <div class="login-input-wrap" style="position:relative;display:flex;align-items:center">
            <span class="login-input-icon i-lucide-user" />
            <input
              id="login-username"
              v-model="loginUsername"
              type="text"
              placeholder="请输入管理员账号"
              autocomplete="username"
              required
              class="login-input"
              style="width:100%;padding:12px 14px 12px 40px;border-radius:8px;font-size:14px;color:#fff;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);outline:none"
            />
          </div>
        </div>

        <!-- 密码 -->
        <div class="login-field" style="display:flex;flex-direction:column;gap:7px">
          <label class="login-label" for="login-password" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:rgba(0,0,0,0.28);padding-left:2px">密码</label>
          <div class="login-input-wrap" style="position:relative;display:flex;align-items:center">
            <span class="login-input-icon i-lucide-lock" />
            <input
              id="login-password"
              v-model="loginPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
              required
              class="login-input login-input--has-toggle"
              style="width:100%;padding:12px 42px 12px 40px;border-radius:8px;font-size:14px;color:#fff;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);outline:none"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="login-toggle-password"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              style="position:absolute;right:12px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:4px;color:rgba(0,0,0,0.25)"
            >
              <span v-if="showPassword" class="i-lucide-eye-off text-[15px]" />
              <span v-else class="i-lucide-eye text-[15px]" />
            </button>
          </div>
        </div>

        <!-- 登录按钮 -->
        <button
          type="submit"
          :disabled="submitting"
          class="login-submit"
          style="width:100%;padding:13px 20px;border-radius:8px;border:none;cursor:pointer;background:#6366f1;color:#fff;font-size:15px;font-weight:600;margin-top:4px"
        >
          <Transition name="login-btn-swap" mode="out-in">
            <span v-if="submitting" key="loading" class="login-submit__inner" style="display:flex;align-items:center;justify-content:center;gap:8px">
              <span class="login-spinner" />
              <span>验证中…</span>
            </span>
            <span v-else key="idle" class="login-submit__inner" style="display:flex;align-items:center;justify-content:center;gap:8px">
              <span class="i-lucide-log-in text-[15px]" />
              <span>登 录</span>
            </span>
          </Transition>
        </button>
      </form>

      <!-- 底部装饰线 -->
      <p class="login-footer" style="text-align:center;margin:28px 0 0;font-size:11px;font-family:ui-monospace,monospace;color:rgba(0,0,0,0.14)">Hehe Admin · v1.0</p>
    </div>
  </div>
</template>

<style scoped>
/* ─── 根容器 ─── */
.login-root {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 20;
  padding: 24px 16px;
  min-height: 100vh;
  overflow: hidden;
}


/* ─── 卡片 ─── */
.login-card {
  position: relative;
  width: 100%;
  max-width: 400px;
  padding: 40px 36px;
  border-radius: 12px;
  background: var(--admin-bg-elevated, rgba(0,0,0,0.04));
  border: 1px solid var(--admin-border-medium, rgba(0,0,0,0.10));
  box-shadow:
    0 0 0 1px var(--admin-border-subtle, rgba(0,0,0,0.06)),
    0 24px 64px rgba(0,0,0,0.28),
    0 8px 24px rgba(0,0,0,0.15);

  animation: login-card-in 0.4s cubic-bezier(0.16,1,0.3,1) both;
}
@keyframes login-card-in {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Light 模式卡片 */
:global(.theme-light .login-card) {
  background: #ffffff;
  border-color: rgba(0,0,0,0.08);
  box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05);
}

/* Classic Dark 模式卡片 */
:global(.theme-classic-dark .login-card) {
  background: #f8fafc;
  border-color: rgba(255,255,255,0.12);
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
}

/* ─── 品牌区 ─── */
.login-brand {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  position: relative;
  width: 52px; height: 52px;
  border-radius: 10px;
  background: var(--admin-brand, #6366f1);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px;
  
}
.login-logo__letter {
  font-size: 22px; font-weight: 700; color: #fff;
  letter-spacing: -0.03em;
}

/* Classic Dark 调整品牌蓝 */
:global(.theme-classic-dark .login-logo) {
  background: var(--admin-brand, #60a5fa);
  
}

.login-title {
  font-size: 20px; font-weight: 700;
  color: var(--admin-text-primary, #fff);
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}
.login-subtitle {
  font-size: 13px;
  color: var(--admin-text-muted, rgba(0,0,0,0.35));
  margin: 0;
}

/* ─── 表单 ─── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ─── 错误提示 ─── */
.login-error {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: #dc2626;
  background: rgba(255,69,58,0.08);
  border: 1px solid rgba(255,69,58,0.18);
}
.login-error-fade-enter-active,
.login-error-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.login-error-fade-enter-from,
.login-error-fade-leave-to {
  opacity: 0; transform: translateY(-4px);
}

/* ─── 表单字段 ─── */
.login-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.login-label {
  font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--admin-text-ultra-muted, rgba(0,0,0,0.28));
  padding-left: 2px;
}

/* ─── 输入框 ─── */
.login-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.login-input-icon {
  position: absolute; left: 13px;
  font-size: 16px;
  color: var(--admin-text-ultra-muted, rgba(0,0,0,0.22));
  pointer-events: none;
  transition: color 0.15s;
}
.login-input {
  width: 100%;
  padding: 12px 14px 12px 40px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--admin-text-primary, #fff);
  background: var(--admin-bg-input, rgba(0,0,0,0.04));
  border: 1px solid var(--admin-border-subtle, rgba(0,0,0,0.08));
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.login-input::placeholder {
  color: var(--admin-text-ultra-muted, rgba(0,0,0,0.20));
}
.login-input:hover {
  border-color: var(--admin-border-medium, rgba(0,0,0,0.15));
  background: var(--admin-bg-hover, rgba(0,0,0,0.06));
}
.login-input:focus {
  border-color: var(--admin-brand, rgba(99,102,241,0.6));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--admin-brand, #6366f1) 12%, transparent);
  background: var(--admin-bg-input, rgba(0,0,0,0.05));
}
.login-input:focus + .login-input-icon,
.login-input-wrap:focus-within .login-input-icon {
  color: var(--admin-brand, #6366f1);
}
.login-input--has-toggle { padding-right: 42px; }

/* 密码显示切换按钮 */
.login-toggle-password {
  position: absolute; right: 12px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  padding: 4px;
  color: var(--admin-text-ultra-muted, rgba(0,0,0,0.25));
  transition: color 0.15s;
  border-radius: 4px;
}
.login-toggle-password:hover {
  color: var(--admin-text-secondary, rgba(0,0,0,0.55));
}

/* ─── 提交按钮 ─── */
.login-submit {
  width: 100%;
  padding: 13px 20px;
  border-radius: 8px;
  border: none; cursor: pointer;
  background: var(--admin-brand, #6366f1);
  color: #ffffff;
  font-size: 15px; font-weight: 600;
  letter-spacing: 0.01em;
  
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
  margin-top: 4px;
}
.login-submit:hover:not(:disabled) {

  
  filter: brightness(1.08);
}
.login-submit:active:not(:disabled) {
  transform: scale(0.98);
}
.login-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.login-submit__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* 加载旋转器 */
.login-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(0,0,0,0.25);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: login-spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes login-spin {
  to { transform: rotate(360deg); }
}

/* 按钮内容切换动画 */
.login-btn-swap-enter-active,
.login-btn-swap-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.login-btn-swap-enter-from {
  opacity: 0; transform: translateY(4px);
}
.login-btn-swap-leave-to {
  opacity: 0; transform: translateY(-4px);
}

/* ─── 底部文字 ─── */
.login-footer {
  text-align: center;
  margin: 28px 0 0;
  font-size: 11px; font-family: ui-monospace, monospace;
  letter-spacing: 0.04em;
  color: var(--admin-text-ultra-muted, rgba(0,0,0,0.14));
}
</style>
