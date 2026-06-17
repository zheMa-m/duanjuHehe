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
  leads: any[] | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  save: [campaign: Campaign]
  'delete-lead': [id: string]
}>()

const filterSubdomain = ref('')

const uniqueSubdomains = computed(() => {
  if (!props.campaigns) return []
  return [...new Set(props.campaigns.map(c => c.subdomain))]
})

const filteredLeads = computed(() => {
  if (!props.leads) return []
  if (!filterSubdomain.value) return props.leads
  return props.leads.filter(lead => lead.subdomain === filterSubdomain.value)
})

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

const handleDeleteLead = (id: string) => {
  if (!confirm('确定要彻底清除该留资预约记录吗？此动作会同步抹除 Supabase 数据库对应条目。')) return
  emit('delete-lead', id)
}

defineExpose({ onSaved })
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 活动大标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-white tracking-tight">动态营销活动管理 (SWR)</h1>
        <p class="text-white/40 text-xs mt-1">管理员在此修改配置，营销 H5 页面通过 SWR 实时热更新</p>
      </div>
      <button 
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
      >
        <span :class="{'animate-spin': isLoading}">🔄</span>
        刷新活动
      </button>
    </div>

    <!-- 编辑配置面板 (高级毛玻璃弹出框) -->
    <Transition name="expand">
      <div v-if="editingCampaign" class="bg-[#0c0c0e]/75 border border-[#0a84ff]/30 p-6 rounded-2xl space-y-5 backdrop-blur-2xl shadow-[0_15px_30px_rgba(0,0,0,0.6),inset_0_1px_rgba(255,255,255,0.05)] relative overflow-hidden group">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-[#0a84ff]/5 blur-xl"></div>
        
        <h3 class="text-xs font-semibold text-[#0a84ff] uppercase tracking-widest flex items-center gap-2 relative z-10 font-mono">
          <span>✏️</span> 编辑活动配置: 
          <code class="px-2 py-0.5 bg-white/5 text-[#30d158] rounded font-mono text-[10px] border border-white/5">{{ editingCampaign.subdomain }}</code>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
          <div class="space-y-2">
            <label class="block text-[9px] font-semibold text-white/40 uppercase tracking-widest pl-1 font-mono">活动标签 (Badge)</label>
            <input 
              v-model="editingCampaign.badge" 
              type="text" 
              class="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-[#0a84ff]/50 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-4 focus:ring-[#0a84ff]/5 transition-all font-light tracking-wide"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-[9px] font-semibold text-white/40 uppercase tracking-widest pl-1 font-mono">主标题 (Title)</label>
            <input 
              v-model="editingCampaign.title" 
              type="text" 
              class="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-[#0a84ff]/50 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-4 focus:ring-[#0a84ff]/5 transition-all font-light tracking-wide"
            />
          </div>
          <div class="md:col-span-2 space-y-2">
            <label class="block text-[9px] font-semibold text-white/40 uppercase tracking-widest pl-1 font-mono">副标题描述 (Subtitle)</label>
            <textarea 
              v-model="editingCampaign.subtitle" 
              rows="3"
              class="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-[#0a84ff]/50 rounded-xl p-4 text-xs text-white focus:outline-none focus:ring-4 focus:ring-[#0a84ff]/5 transition-all font-light tracking-wide leading-relaxed"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2 relative z-10">
          <button 
            @click="editingCampaign = null"
            class="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-full text-white/70 transition-all active:scale-[0.98] border border-white/[0.05] cursor-pointer"
          >
            取消
          </button>
          <button 
            @click="handleSave"
            :disabled="isSavingCampaign"
            class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-xs font-semibold rounded-full text-white transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.2)]"
          >
            {{ isSavingCampaign ? '保存中...' : '确认发布' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- 营销活动列表 (毛玻璃卡片) -->
    <div class="bg-[#0c0c0e]/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[9px] bg-white/[0.005]">
              <th class="px-6 py-4 font-semibold font-mono">绑定子域名</th>
              <th class="px-6 py-4 font-semibold font-mono">活动徽章</th>
              <th class="px-6 py-4 font-semibold font-mono">活动大标题</th>
              <th class="px-6 py-4 font-semibold font-mono">副标题说明</th>
              <th class="px-6 py-4 font-semibold font-mono text-right">管理操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="cam in campaigns" :key="cam.subdomain" class="hover:bg-white/[0.02] transition-colors duration-200">
              <td class="px-6 py-4 font-semibold text-[#0a84ff] font-mono text-xs tracking-wide">
                {{ cam.subdomain }}.yourdomain.localhost
              </td>
              <td class="px-6 py-4">
                <span class="px-2.5 py-0.5 bg-white/5 text-white/60 border border-white/10 rounded text-[10px] font-semibold tracking-wide font-mono">{{ cam.badge }}</span>
              </td>
              <td class="px-6 py-4 text-white/90 font-semibold max-w-[150px] truncate">{{ cam.title }}</td>
              <td class="px-6 py-4 text-white/50 max-w-[200px] truncate font-light leading-relaxed">{{ cam.subtitle }}</td>
              <td class="px-6 py-4 text-right">
                <div class="inline-flex items-center gap-2 flex-wrap justify-end">
                  <NuxtLink 
                    :to="`/h5/${cam.subdomain}`"
                    target="_blank"
                    class="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3.5 py-1.5 rounded-full border border-white/10 transition-all inline-flex items-center gap-1 text-[10px] font-semibold no-underline tracking-wide cursor-pointer focus:outline-none"
                  >
                    <span class="text-[11px]">📲</span> V1
                  </NuxtLink>
                  <NuxtLink 
                    :to="`/h5-v2/${cam.subdomain}`"
                    target="_blank"
                    class="text-xs bg-[#30d158]/5 hover:bg-[#30d158]/12 text-[#30d158] px-3.5 py-1.5 rounded-full border border-[#30d158]/25 transition-all inline-flex items-center gap-1 text-[10px] font-semibold no-underline tracking-wide cursor-pointer focus:outline-none"
                  >
                    <span class="text-[11px]">✦</span> V2
                  </NuxtLink>
                  <button 
                    @click="startEditCampaign(cam)"
                    class="text-xs bg-gradient-to-r from-blue-600/10 to-indigo-500/10 hover:from-blue-600/20 hover:to-indigo-500/20 text-[#0a84ff] px-3.5 py-1.5 rounded-full border border-[#0a84ff]/25 transition-all text-[10px] font-semibold tracking-wide cursor-pointer focus:outline-none"
                  >
                    编辑活动
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!campaigns || campaigns.length === 0">
              <td colspan="5" class="py-12 text-center text-xs text-white/25 font-light">暂无营销活动数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 营销留资预约看板 (Leads) -->
    <div class="space-y-4 pt-8 border-t border-white/[0.08]">
      <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 class="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            营销留资预约看板
            <span class="text-[9px] px-2 py-0.5 bg-[#30d158]/10 text-[#30d158] rounded-full border border-[#30d158]/20 font-mono font-medium">Leads Dashboard</span>
          </h2>
          <p class="text-white/40 text-[11px] mt-0.5">C 端 H5 营销活动页面实时收集的用户数据，永久与 Supabase 同步</p>
        </div>
        
        <!-- 过滤器 (毛玻璃下拉) -->
        <div class="flex items-center gap-3">
          <span class="text-[9px] font-semibold text-white/40 uppercase tracking-widest font-mono">Filter Domain:</span>
          <select 
            v-model="filterSubdomain"
            class="bg-[#141416] border border-white/[0.08] hover:border-white/20 text-xs text-white/80 rounded-full px-4 py-2 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all cursor-pointer font-light"
          >
            <option value="">全部推广渠道</option>
            <option v-for="sub in uniqueSubdomains" :key="sub" :value="sub">
              {{ sub }}.yourdomain.localhost
            </option>
          </select>
        </div>
      </div>

      <!-- 留资表格 (毛玻璃卡片) -->
      <div class="bg-[#0c0c0e]/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[9px] bg-white/[0.005]">
                <th class="px-6 py-4 font-semibold font-mono">注册邮箱 (Email)</th>
                <th class="px-6 py-4 font-semibold font-mono">联系电话 (Phone)</th>
                <th class="px-6 py-4 font-semibold font-mono">推广渠道 / 子域</th>
                <th class="px-6 py-4 font-semibold font-mono">关联用户 ID</th>
                <th class="px-6 py-4 font-semibold font-mono">预约登记时间</th>
                <th class="px-6 py-4 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="lead in filteredLeads" :key="lead.id" class="hover:bg-white/[0.02] transition-colors duration-200">
                <td class="px-6 py-4 text-white font-medium font-mono text-xs">{{ lead.email }}</td>
                <td class="px-6 py-4 text-white/80 font-mono text-xs">{{ lead.phone }}</td>
                <td class="px-6 py-4 text-[#30d158] font-mono text-xs tracking-wide">
                  {{ lead.subdomain }}.yourdomain.localhost
                </td>
                <td class="px-6 py-4 text-white/30 font-mono text-[11px]">
                  {{ lead.user_id || '直接访客 (未登录)' }}
                </td>
                <td class="px-6 py-4 text-white/40 font-mono text-[11px]">
                  {{ new Date(lead.created_at).toLocaleString() }}
                </td>
                <td class="px-6 py-4 text-right">
                  <button 
                    @click="handleDeleteLead(lead.id)"
                    class="text-[10px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-4 py-2 rounded-full border border-[#ff453a]/25 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                  >
                    删除记录
                  </button>
                </td>
              </tr>
              <tr v-if="!filteredLeads || filteredLeads.length === 0">
                <td colspan="6" class="py-12 text-center text-xs text-white/25 font-light">
                  暂无任何预约留资客户记录。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 编辑框伸缩动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.99);
}
</style>
