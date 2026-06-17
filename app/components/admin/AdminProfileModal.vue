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
    <!-- 毛玻璃遮罩 -->
    <div 
      @click="handleClose"
      class="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
    ></div>
    
    <!-- Modal 主体 -->
    <div class="bg-[#1c1c1e]/90 border border-white/10 w-full max-w-[420px] rounded-2xl p-6 shadow-2xl relative z-10 backdrop-blur-xl animate-fade-in">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h3 class="text-base font-semibold text-white tracking-tight">安全与账号设置</h3>
          <p class="text-[11px] text-white/40 mt-1">更新管理员的安全凭据及基本信息</p>
        </div>
        <button 
          @click="handleClose"
          class="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all text-xs border-0 outline-none"
        >
          ✕
        </button>
      </div>

      <form @submit.prevent="handleSave" class="space-y-4">
        <!-- 提示区域 -->
        <div v-if="profileError" class="text-xs text-[#ff453a] bg-[#ff453a]/10 border border-[#ff453a]/20 px-3 py-2 rounded-lg">
          ⚠️ {{ profileError }}
        </div>
        <div v-if="profileSuccess" class="text-xs text-[#30d158] bg-[#30d158]/10 border border-[#30d158]/20 px-3 py-2 rounded-lg">
          ✔ {{ profileSuccess }}
        </div>

        <!-- 头像上传 -->
        <div>
          <label class="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 pl-1">头像</label>
          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="handleAvatarClick"
              class="relative w-12 h-12 rounded-full border-2 border-white/10 hover:border-[#007aff] transition-all overflow-hidden flex items-center justify-center bg-white/[0.04] flex-shrink-0"
              :disabled="isUploading"
            >
              <img
                v-if="currentAvatarUrl"
                :src="currentAvatarUrl"
                alt="avatar"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-white/30 text-lg">👤</span>
              <span v-if="isUploading" class="absolute w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              </span>
            </button>
            <div class="text-[11px] text-white/30">
              <p>点击更换头像</p>
              <p>支持 JPG/PNG，最大 2MB</p>
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

        <!-- 账号（只读展示，来自 useAuth） -->
        <div>
          <label class="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 pl-1">管理账号</label>
          <input 
            type="text" 
            :value="user?.email || user?.username || '-'"
            disabled
            class="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3.5 py-2.5 text-xs text-white/40 focus:outline-none cursor-not-allowed font-light"
          />
        </div>

        <!-- 新密码 -->
        <div>
          <label class="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 pl-1">设置新密码</label>
          <input 
            v-model="newPassword" 
            type="password" 
            placeholder="至少 6 位安全字符"
            required
            class="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] transition-all font-light"
          />
        </div>

        <!-- 确认密码 -->
        <div>
          <label class="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 pl-1">确认新密码</label>
          <input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="请再次输入新密码"
            required
            class="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] transition-all font-light"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2.5 pt-3">
          <button 
            type="button"
            @click="handleClose"
            class="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-full text-white/70 transition-all active:scale-[0.98] border-0"
          >
            取消
          </button>
          <button 
            type="submit"
            :disabled="isSaving"
            class="px-5 py-2 bg-[#007aff] hover:bg-[#007aff]/90 text-xs font-medium rounded-full text-white transition-all active:scale-[0.98] disabled:opacity-50 border-0 flex items-center gap-1.5"
          >
            <span v-if="isSaving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ isSaving ? '正在保存...' : '保存修改' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
