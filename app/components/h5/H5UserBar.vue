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
        <span class="i-lucide-user guest-icon" />
        <span class="guest-label">{{ t('userBar.guest') }}</span>
      </div>
      <button class="register-btn" @click="emit('register')">{{ t('userBar.signUpForMore') }}</button>
    </template>

    <!-- 未登录 -->
    <template v-else>
      <div class="guest-info">
        <span class="i-lucide-user guest-icon" />
        <span class="guest-label">{{ t('userBar.notSignedIn') }}</span>
      </div>
      <button class="login-btn" @click="emit('login')">{{ t('userBar.signIn') }}</button>
    </template>
  </div>
</template>

<style scoped>
.user-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.65rem 1rem; background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.8rem;
  color: #f8fafc;
}

.user-info { display: flex; align-items: center; gap: 0.5rem; }
.avatar {
  width: 26px; height: 26px; border-radius: 50%;
  overflow: hidden; background: rgba(255, 255, 255, 0.08); display: flex;
  align-items: center; justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder {
  font-weight: 700; font-size: 0.75rem; color: #818cf8;
}
.display-name { font-weight: 600; color: #f1f5f9; font-size: 0.75rem; }

.logout-btn {
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;
  padding: 0.3rem 0.65rem; font-size: 0.7rem; color: #94a3b8;
  cursor: pointer; transition: all 0.2s;
}
.logout-btn:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.2); color: #f1f5f9; }

.guest-info { display: flex; align-items: center; gap: 0.35rem; }
.guest-icon { font-size: 14px; opacity: 0.7; }
.guest-label { color: #94a3b8; font-weight: 500; font-size: 0.75rem; }

.login-btn {
  background: #4f46e5; color: #fff; border: none; border-radius: 6px;
  padding: 0.35rem 0.85rem; font-size: 0.75rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.login-btn:hover { background: #4338ca; }

.register-btn {
  background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff;
  border: none; border-radius: 6px; padding: 0.35rem 0.85rem;
  font-size: 0.75rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
}
.register-btn:hover { opacity: 0.9; transform: translateY(-0.5px); }
</style>
