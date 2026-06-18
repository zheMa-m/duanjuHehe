<script setup lang="ts">
const emit = defineEmits<{
  close: []
  saved: []
}>()

const props = defineProps<{
  avatarUrl?: string | null
}>()

const { user } = useAuth()

const newPassword = ref('')
const confirmPassword = ref('')
const profileError = ref('')
const profileSuccess = ref('')
const isSaving = ref(false)

// 头像上传相关
const { upload: uploadFile, getPublicUrl } = useStorage()
const avatarInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const currentAvatarUrl = ref(props.avatarUrl || null)

const handleAvatarClick = () => {
  avatarInput.value?.click()
}

const handleAvatarChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 校验文件类型
  if (!file.type.startsWith('image/')) {
    profileError.value = '请选择图片文件'
    return
  }

  // 校验文件大小（2MB）
  if (file.size > 2 * 1024 * 1024) {
    profileError.value = '头像文件不能超过 2MB'
    return
  }

  isUploading.value = true
  profileError.value = ''

  try {
    const result = await uploadFile(file, 'avatars')

    // 更新 profile 的 avatar_url
    await $fetch('/api/v1/auth/profile', {
      method: 'PATCH',
      body: { avatar_url: result.publicUrl || result.path }
    })

    currentAvatarUrl.value = result.publicUrl || getPublicUrl('avatars', result.path)
    profileSuccess.value = '头像更新成功！'
    emit('saved')

    setTimeout(() => {
      profileSuccess.value = ''
    }, 2000)
  } catch (e: any) {
    profileError.value = '头像上传失败: ' + (e.data?.statusMessage || e.message)
  } finally {
    isUploading.value = false
    // 重置 input 以允许再次选择同一文件
    if (avatarInput.value) avatarInput.value.value = ''
  }
}

const handleSave = async () => {
  profileError.value = ''
  profileSuccess.value = ''

  if (!newPassword.value) {
    profileError.value = '新密码不能为空'
    return
  }
  if (newPassword.value.length < 6) {
    profileError.value = '密码长度不能少于 6 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    profileError.value = '两次输入的新密码不一致'
    return
  }

  isSaving.value = true
  try {
    // 调用 API，密码哈希/验证在服务端完成，前端不再持久化原文密码
    await $fetch('/api/admin/profile/password', {
      method: 'PATCH',
      body: { password: newPassword.value }
    })

    profileSuccess.value = '密码更新成功！'
    newPassword.value = ''
    confirmPassword.value = ''

    setTimeout(() => {
      emit('saved')
      emit('close')
      profileSuccess.value = ''
    }, 1200)
  } catch (e: any) {
    profileError.value = '更新密码失败: ' + (e.data?.statusMessage || e.message)
  } finally {
    isSaving.value = false
  }
}

const handleClose = () => {
  newPassword.value = ''
  confirmPassword.value = ''
  profileError.value = ''
  profileSuccess.value = ''
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- 高级毛玻璃深色遮罩层 -->
    <div 
      @click="handleClose"
      class="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
    ></div>
    
    <!-- Modal 主体 (赛博磨砂框) -->
    <div class="bg-[#12121a]/90 w-full max-w-[420px] rounded-3xl p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_8px_40px_rgba(0,0,0,0.4)] relative z-10 backdrop-blur-2xl animate-fade-in group overflow-hidden">
      
      <!-- 顶部漫反射氛围点 -->
      <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/8 blur-xl group-hover:bg-indigo-500/15 transition-all"></div>
      
      <!-- 头部 -->
      <div class="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 class="text-base font-semibold text-white tracking-wide">账号与安全设置</h3>
          <p class="text-[11px] text-white/35 uppercase tracking-widest mt-1.5 font-mono">个人资料与凭据</p>
        </div>
        <button 
          @click="handleClose"
          class="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all text-xs border-0 outline-none cursor-pointer"
        >
          ✕
        </button>
      </div>

      <form @submit.prevent="handleSave" class="space-y-5 relative z-10">
        <!-- 错误与成功提示 -->
        <Transition name="slide-up">
          <div v-if="profileError" class="text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
            ⚠️ <span class="font-light tracking-wide">{{ profileError }}</span>
          </div>
        </Transition>
        <Transition name="slide-up">
          <div v-if="profileSuccess" class="text-[11px] text-[#30d158] bg-[#30d158]/5 border border-[#30d158]/20 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
            ✔ <span class="font-light tracking-wide">{{ profileSuccess }}</span>
          </div>
        </Transition>

        <!-- 头像上传 -->
        <div class="space-y-2">
          <label class="block text-[11px] font-semibold text-white/40 uppercase tracking-widest pl-1 font-mono">上传头像</label>
          <div class="flex items-center gap-4">
            <button
              type="button"
              @click="handleAvatarClick"
              class="relative w-14 h-14 rounded-full border border-white/10 hover:border-indigo-500/40 transition-all overflow-hidden flex items-center justify-center bg-white/[0.03] flex-shrink-0 cursor-pointer focus:outline-none ring-offset-black"
              :disabled="isUploading"
            >
              <img
                v-if="currentAvatarUrl"
                :src="currentAvatarUrl"
                alt="avatar"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-white/30 text-lg">👤</span>
              <span v-if="isUploading" class="absolute w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              </span>
            </button>
            <div class="text-[10px] text-white/30 space-y-0.5 leading-relaxed font-light">
              <p class="text-white/50 font-medium">点击图片上传新头像</p>
              <p>支持 JPG/PNG，最大限额 2MB</p>
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarChange"
            />
          </div>
        </div>

        <!-- 账号（只读展示） -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-semibold text-white/40 uppercase tracking-widest pl-1 font-mono">管理员账号</label>
          <input 
            type="text" 
            :value="user?.email || user?.username || '-'"
            disabled
            class="w-full bg-white/[0.01] border border-white/[0.04] rounded-xl px-4 py-2.5 text-sm text-white/30 focus:outline-none cursor-not-allowed font-light font-mono"
          />
        </div>

        <!-- 新密码 -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-semibold text-white/40 uppercase tracking-widest pl-1 font-mono">设置新密码</label>
          <input 
            v-model="newPassword" 
            type="password" 
            placeholder="至少 6 位安全字符"
            required
            class="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-light"
          />
        </div>

        <!-- 确认密码 -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-semibold text-white/40 uppercase tracking-widest pl-1 font-mono">确认新密码</label>
          <input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="请再次输入以确认新密码"
            required
            class="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-light"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-3 pt-3">
          <button 
            type="button"
            @click="handleClose"
            class="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-full text-white/70 transition-all active:scale-[0.98] border border-white/[0.05] cursor-pointer focus:outline-none"
          >
            取消
          </button>
          <button 
            type="submit"
            :disabled="isSaving"
            class="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-sm font-semibold rounded-full text-white transition-all active:scale-[0.98] disabled:opacity-50 border-0 flex items-center gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.25)] focus:outline-none"
          >
            <span v-if="isSaving" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ isSaving ? '正在保存...' : '保存密码' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
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
