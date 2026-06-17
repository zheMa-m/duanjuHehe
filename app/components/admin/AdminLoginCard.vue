<script setup lang="ts">
const emit = defineEmits<{
  login: [username: string, password: string]
}>()

const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')
const showPassword = ref(false)

const handleLogin = () => {
  loginError.value = ''
  if (!loginUsername.value || !loginPassword.value) {
    loginError.value = '请输入用户名和密码'
    return
  }
  emit('login', loginUsername.value, loginPassword.value)
}

// 供父组件调用，展示登录错误
const showError = (msg: string) => {
  loginError.value = msg
}

defineExpose({ showError })
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center relative z-20 px-6 py-12 animate-fade-in">
    <!-- 极高奢华赛博暗黑毛玻璃登录卡片 -->
    <div class="w-full max-w-[400px] bg-[#0c0c0e]/60 border border-white/[0.08] rounded-3xl p-9 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_rgba(255,255,255,0.05)] relative overflow-hidden transition-all hover:border-white/10 group">
      
      <!-- 卡片内顶部微弱紫光点缀 -->
      <div class="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-purple-500/10 blur-2xl group-hover:bg-purple-500/15 transition-all"></div>
      
      <!-- Logo 区域 -->
      <div class="flex flex-col items-center mb-8 relative z-10">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xl mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse-glow">
          H
        </div>
        <h2 class="text-xl font-semibold text-white tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Project Admin Portal</h2>
        <p class="text-[10px] text-white/30 uppercase tracking-widest mt-1.5 font-mono">SECURE ACCESS CONTROL</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6 relative z-10">
        <!-- 错误提示（高品质毛玻璃红框） -->
        <Transition name="slide-up">
          <div v-if="loginError" class="text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 px-4 py-3 rounded-xl flex items-center gap-2.5 backdrop-blur-md shadow-lg shadow-black/20">
            <span class="text-xs">⚠️</span>
            <span class="font-light tracking-wide">{{ loginError }}</span>
          </div>
        </Transition>

        <!-- 管理账号输入 -->
        <div class="space-y-2">
          <label class="block text-[9px] font-semibold text-white/40 uppercase tracking-widest pl-1 font-mono">Admin Username</label>
          <div class="relative flex items-center">
            <span class="absolute left-4 text-white/30 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <input 
              v-model="loginUsername" 
              type="text" 
              placeholder="请输入管理员账号"
              required
              class="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-[#0a84ff]/50 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-4 focus:ring-[#0a84ff]/10 transition-all font-light tracking-wide placeholder:text-white/20"
            />
          </div>
        </div>

        <!-- 密码输入 -->
        <div class="space-y-2">
          <label class="block text-[9px] font-semibold text-white/40 uppercase tracking-widest pl-1 font-mono">Security Password</label>
          <div class="relative flex items-center">
            <span class="absolute left-4 text-white/30 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <input 
              v-model="loginPassword" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="请输入密码"
              required
              class="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-[#0a84ff]/50 rounded-xl pl-11 pr-11 py-3 text-xs text-white focus:outline-none focus:ring-4 focus:ring-[#0a84ff]/10 transition-all font-light tracking-wide placeholder:text-white/20"
            />
            <!-- 密码明文切换眼睛图标 -->
            <button 
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-4 text-white/30 hover:text-[#0a84ff] transition-colors bg-transparent border-0 cursor-pointer p-0 flex items-center justify-center focus:outline-none"
            >
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 登录按钮（高光流渐变） -->
        <button 
          type="submit"
          class="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 active:scale-[0.98] text-xs font-semibold py-3.5 rounded-xl text-white transition-all shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.4)] mt-4 tracking-wide cursor-pointer"
        >
          安全校验登录
        </button>
      </form>

      <div class="text-center text-[9px] text-white/20 mt-8 tracking-widest font-mono uppercase">
        SECURED BY HARNESS SHIELD
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 呼吸点动画 */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 12px rgba(59,130,246,0.25); }
  50% { box-shadow: 0 0 22px rgba(59,130,246,0.5); }
}
.animate-pulse-glow {
  animation: pulse-glow 2.5s ease-in-out infinite;
}

/* 错误提示淡入淡出 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
