<script setup lang="ts">
interface Campaign {
  subdomain: string
  title: string
  subtitle: string
  badge: string
  color_from: string
  color_to: string
}

const props = defineProps<{
  campaigns: Campaign[] | null
  isLoading: boolean
}>()

const baseUrl = useRuntimeConfig().public.baseUrl

const emit = defineEmits<{
  refresh: []
  save: [campaign: Campaign]
}>()

const editingCampaign = ref<Campaign | null>(null)
const isSavingCampaign = ref(false)

const startEditCampaign = (item: Campaign) => {
  editingCampaign.value = { ...item }
}

const handleSave = async () => {
  if (!editingCampaign.value) return
  isSavingCampaign.value = true
  try {
    emit('save', editingCampaign.value)
    editingCampaign.value = null
  } finally {
    isSavingCampaign.value = false
  }
}

// 供父组件通知保存完成
const onSaved = () => {
  editingCampaign.value = null
  isSavingCampaign.value = false
}

defineExpose({ onSaved })
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-white tracking-tight">动态营销活动管理 (SWR)</h1>
        <p class="text-white/40 text-xs mt-1">管理员在此修改配置，营销 H5 页面通过 SWR 实时热更新</p>
      </div>
      <button 
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98]"
      >
        🔄 刷新活动
      </button>
    </div>

    <!-- 编辑配置面板 -->
    <div v-if="editingCampaign" class="bg-[#1c1c1e] border border-[#007aff]/35 p-6 rounded-2xl space-y-4 animate-fade-in">
      <h3 class="text-xs font-semibold text-[#0a84ff] uppercase tracking-wider flex items-center gap-1.5">
        ✏️ 编辑活动配置: <code class="px-1.5 py-0.5 bg-white/5 text-[#30d158] rounded font-mono text-[10px]">{{ editingCampaign.subdomain }}</code>
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">活动标签 (Badge)</label>
          <input 
            v-model="editingCampaign.badge" 
            type="text" 
            class="w-full bg-[#2c2c2e] border-0 rounded-lg px-3.5 py-2.5 text-xs text-white focus:ring-1 focus:ring-[#007aff] transition-all font-light"
          />
        </div>
        <div>
          <label class="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">主标题 (Title)</label>
          <input 
            v-model="editingCampaign.title" 
            type="text" 
            class="w-full bg-[#2c2c2e] border-0 rounded-lg px-3.5 py-2.5 text-xs text-white focus:ring-1 focus:ring-[#007aff] transition-all font-light"
          />
        </div>
        <div class="md:col-span-2">
          <label class="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">副标题描述 (Subtitle)</label>
          <textarea 
            v-model="editingCampaign.subtitle" 
            rows="2"
            class="w-full bg-[#2c2c2e] border-0 rounded-lg p-3.5 text-xs text-white focus:ring-1 focus:ring-[#007aff] transition-all font-light"
          ></textarea>
        </div>
      </div>

      <div class="flex justify-end gap-2.5 pt-1">
        <button 
          @click="editingCampaign = null"
          class="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-full text-white/70 transition-all active:scale-[0.98]"
        >
          取消
        </button>
        <button 
          @click="handleSave"
          :disabled="isSavingCampaign"
          class="px-4 py-2 bg-[#007aff] hover:bg-[#007aff]/90 text-xs font-medium rounded-full text-white transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {{ isSavingCampaign ? '保存中...' : '确认发布' }}
        </button>
      </div>
    </div>

    <!-- 营销活动列表 -->
    <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/5 text-white/40 uppercase tracking-wider text-[9px]">
              <th class="px-6 py-3.5 font-medium">绑定子域名</th>
              <th class="px-6 py-3.5 font-medium">活动徽章</th>
              <th class="px-6 py-3.5 font-medium">活动大标题</th>
              <th class="px-6 py-3.5 font-medium">副标题说明</th>
              <th class="px-6 py-3.5 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="cam in campaigns" :key="cam.subdomain" class="hover:bg-white/[0.02] transition-colors">
              <td class="px-6 py-3.5 font-medium text-[#0a84ff]">
                {{ cam.subdomain }}.yourdomain.localhost
              </td>
              <td class="px-6 py-3.5">
                <span class="px-2 py-0.5 bg-white/5 text-white/60 rounded text-[10px] font-medium">{{ cam.badge }}</span>
              </td>
              <td class="px-6 py-3.5 text-white/90 font-medium max-w-[150px] truncate">{{ cam.title }}</td>
              <td class="px-6 py-3.5 text-white/50 max-w-[200px] truncate font-light">{{ cam.subtitle }}</td>
              <td class="px-6 py-3.5 text-right space-x-2">
                <a 
                  :href="`${baseUrl}/h5/${cam.subdomain}`"
                  target="_blank"
                  class="text-xs bg-white/5 hover:bg-white/10 text-white/80 px-3 py-1.5 rounded-full transition-all inline-block text-[11px] font-medium"
                >
                  📲 预览
                </a>
                <button 
                  @click="startEditCampaign(cam)"
                  class="text-xs bg-[#007aff]/10 hover:bg-[#007aff]/20 text-[#0a84ff] px-3.5 py-1.5 rounded-full transition-all text-[11px] font-medium"
                >
                  编辑
                </button>
              </td>
            </tr>
            <tr v-if="!campaigns || campaigns.length === 0">
              <td colspan="5" class="py-12 text-center text-xs text-white/30">暂无活动数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
