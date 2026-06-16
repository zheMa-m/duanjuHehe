<script setup lang="ts">
const emit = defineEmits<{
  login: [username: string, password: string]
}>()

const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')

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
    <!-- 极简高奢登录卡片 -->
    <div class="w-full max-w-[380px] bg-[#1c1c1e]/60 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative">
      
      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-12 h-12 rounded-2xl bg-white flex items-center justify-center font-bold text-black text-xl mb-3 shadow-[0_4px_12px_rgba(255,255,255,0.15)]">
          
        </div>
        <h2 class="text-lg font-semibold text-white tracking-tight">Project Admin Portal</h2>
        <p class="text-[11px] text-white/40 mt-1">请输入管理员身份凭证以继续</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <!-- 错误提示 -->
        <div v-if="loginError" class="text-xs text-[#ff453a] bg-[#ff453a]/10 border border-[#ff453a]/20 px-3.5 py-2.5 rounded-lg flex items-center gap-2">
          <span>⚠️</span> {{ loginError }}
        </div>

        <div>
          <label class="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 pl-1">管理账号</label>
          <input 
            v-model="loginUsername" 
            type="text" 
            placeholder="请输入账号 (提示: admin)"
            required
            class="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] transition-all font-light"
          />
        </div>

        <div>
          <label class="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 pl-1">访问密码</label>
          <input 
            v-model="loginPassword" 
            type="password" 
            placeholder="请输入密码"
            required
            class="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] transition-all font-light"
          />
        </div>

        <button 
          type="submit"
          class="w-full bg-[#007aff] hover:bg-[#007aff]/90 active:scale-[0.98] text-xs font-semibold py-3 rounded-lg text-white transition-all shadow-[0_4px_12px_rgba(0,122,255,0.3)] mt-2"
        >
          安全登录
        </button>
      </form>

      <div class="text-center text-[10px] text-white/20 mt-8 tracking-wider">
        SECURED BY HARNESS SHIELD
      </div>
    </div>
  </div>
</template>
