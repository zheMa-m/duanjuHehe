<script setup lang="ts">
/**
 * H5 用户状态栏组件
 *
 * 顶部显示用户登录状态：
 * - 未登录：显示"登录"按钮
 * - 匿名用户：显示"游客" + "注册享更多"引导
 * - 已登录：显示头像 + 昵称 + 退出按钮
 */

const emit = defineEmits<{
  login: []
  register: []
  logout: []
}>()

const { user, isLoggedIn, isAnonymous, signOut } = useAuth()
const { t } = useI18n()

async function handleLogout() {
  await signOut()
  emit('logout')
}
</script>

<template>
  <div class="user-bar">
    <!-- 已登录 -->
    <template v-if="isLoggedIn">
      <div class="user-info">
        <div class="avatar">
          <img v-if="user?.avatarUrl" :src="user.avatarUrl" :alt="user.displayName" />
          <span v-else class="avatar-placeholder">
            {{ (user?.displayName || user?.username || 'U').charAt(0).toUpperCase() }}
          </span>
        </div>
        <span class="display-name">{{ user?.displayName || user?.username }}</span>
      </div>
      <button class="logout-btn" @click="handleLogout">{{ t('userBar.signOut') }}</button>
    </template>

    <!-- 匿名用户 -->
    <template v-else-if="isAnonymous">
      <div class="guest-info">
        <span class="guest-icon">👤</span>
        <span class="guest-label">{{ t('userBar.guest') }}</span>
      </div>
      <button class="register-btn" @click="emit('register')">{{ t('userBar.signUpForMore') }}</button>
    </template>

    <!-- 未登录 -->
    <template v-else>
      <div class="guest-info">
        <span class="guest-icon">👤</span>
        <span class="guest-label">{{ t('userBar.notSignedIn') }}</span>
      </div>
      <button class="login-btn" @click="emit('login')">{{ t('userBar.signIn') }}</button>
    </template>
  </div>
</template>

<style scoped>
.user-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1rem; background: rgba(255,255,255,0.95);
  backdrop-filter: blur(8px); border-bottom: 1px solid #f0f0f0;
  font-size: 0.875rem;
}

.user-info { display: flex; align-items: center; gap: 0.625rem; }
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  overflow: hidden; background: #e5e7eb; display: flex;
  align-items: center; justify-content: center;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder {
  font-weight: 700; font-size: 0.875rem; color: #6366f1;
}
.display-name { font-weight: 600; color: #1a1a2e; }

.logout-btn {
  background: none; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 0.4rem 0.875rem; font-size: 0.8rem; color: #6b7280;
  cursor: pointer; transition: all 0.2s;
}
.logout-btn:hover { background: #f9fafb; border-color: #d1d5db; }

.guest-info { display: flex; align-items: center; gap: 0.5rem; }
.guest-icon { font-size: 1.125rem; }
.guest-label { color: #9ca3af; font-weight: 500; }

.login-btn {
  background: #6366f1; color: #fff; border: none; border-radius: 8px;
  padding: 0.5rem 1.125rem; font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s;
}
.login-btn:hover { opacity: 0.9; }

.register-btn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
  border: none; border-radius: 8px; padding: 0.5rem 1rem;
  font-size: 0.85rem; font-weight: 600; cursor: pointer;
  transition: opacity 0.2s;
}
.register-btn:hover { opacity: 0.9; }
</style>
