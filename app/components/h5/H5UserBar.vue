<script setup lang="ts">
/**
 * H5 用户状态栏组件 — Huashu Design 重构
 */
const emit = defineEmits<{ login: []; register: []; logout: [] }>()
const { user, isLoggedIn, isAnonymous, signOut } = useAuth()
const { t } = useI18n()
async function handleLogout() { await signOut(); emit('logout') }
</script>

<template>
  <div class="user-bar">
    <template v-if="isLoggedIn">
      <div class="user-info">
        <div class="avatar">
          <img v-if="user?.avatarUrl" :src="user.avatarUrl" :alt="user.displayName" />
          <span v-else class="avatar-placeholder">{{ (user?.displayName || user?.username || 'U').charAt(0).toUpperCase() }}</span>
        </div>
        <span class="display-name">{{ user?.displayName || user?.username }}</span>
      </div>
      <button class="logout-btn" @click="handleLogout">{{ t('userBar.signOut') }}</button>
    </template>
    <template v-else-if="isAnonymous">
      <div class="guest-info">
        <span class="i-lucide-user guest-icon" />
        <span class="guest-label">{{ t('userBar.guest') }}</span>
      </div>
      <button class="register-btn" @click="emit('register')">{{ t('userBar.signUpForMore') }}</button>
    </template>
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
  padding: 0.6rem 1rem; background: rgba(255,255,255,0.04);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 0.8rem; color: #F1F5F9; transition: background 0.3s ease;
}
.user-info { display: flex; align-items: center; gap: 0.5rem; }
.avatar {
  width: 28px; height: 28px; border-radius: 50%; overflow: hidden;
  background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,0.1); transition: border-color 0.2s ease;
}
.avatar:hover { border-color: rgba(212,168,83,0.3); }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-weight: 700; font-size: 0.75rem; color: #D4A853; }
.display-name { font-weight: 600; color: #F1F5F9; font-size: 0.75rem; }
.logout-btn {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 0.3rem 0.7rem; font-size: 0.7rem; color: #94A3B8;
  cursor: pointer; transition: all 0.2s ease;
}
.logout-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); color: #F1F5F9; }
.guest-info { display: flex; align-items: center; gap: 0.4rem; }
.guest-icon { font-size: 14px; opacity: 0.5; color: #94A3B8; }
.guest-label { color: #94A3B8; font-weight: 500; font-size: 0.75rem; }
.login-btn {
  background: rgba(212,168,83,0.12); color: #D4A853;
  border: 1px solid rgba(212,168,83,0.2); border-radius: 8px;
  padding: 0.35rem 0.85rem; font-size: 0.75rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease;
}
.login-btn:hover { background: rgba(212,168,83,0.2); border-color: rgba(212,168,83,0.35); }
.register-btn {
  background: #D4A853; color: #08080F; border: none; border-radius: 8px;
  padding: 0.35rem 0.85rem; font-size: 0.75rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease;
}
.register-btn:hover { background: #C49040; transform: translateY(-0.5px); box-shadow: 0 4px 12px rgba(212,168,83,0.2); }
@media (prefers-reduced-motion: reduce) {
  .user-bar, .avatar, .logout-btn, .login-btn, .register-btn { transition: none; }
  .register-btn:hover { transform: none; }
}
</style>
