<script setup lang="ts">
interface ApiKey {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
  is_active: boolean
  last_used_at: string | null
  created_at: string
}
interface SecurityPolicy {
  rate_limit: { enabled: boolean; window_seconds: number; max_requests: number }
  ip_policy: { mode: string; whitelist: string[]; blacklist: string[] }
  signature_required: boolean
  updated_at: string | null
}
interface SecurityLog {
  id: number
  action: string
  ip: string | null
  metadata: Record<string, any>
  created_at: string
}

const props = defineProps<{ isLoading: boolean }>()
const emit = defineEmits<{ refresh: [] }>()

const loading = ref(false)
const activeSection = ref<'keys' | 'policy' | 'logs'>('keys')

const keys = ref<ApiKey[]>([])
const policy = ref<SecurityPolicy | null>(null)
const logs = ref<SecurityLog[]>([])

const fetchKeys = async () => {
  try {
    const res = await $fetch<any>('/api/admin/security/keys').catch(() => null)
    keys.value = res?.data || []
  } catch { keys.value = [] }
}
const fetchPolicy = async () => {
  try {
    const res = await $fetch<any>('/api/admin/security/policy').catch(() => null)
    policy.value = res?.data || null
  } catch { policy.value = null }
}
const fetchLogs = async () => {
  try {
    const res = await $fetch<any>('/api/admin/security/logs').catch(() => null)
    logs.value = res?.data || []
  } catch { logs.value = [] }
}

const fetchAll = async () => {
  loading.value = true
  await Promise.all([fetchKeys(), fetchPolicy(), fetchLogs()])
  loading.value = false
}
onMounted(() => fetchAll())

const handleRefresh = async () => {
  emit('refresh')
  await fetchAll()
}

const sections = [
  { id: 'keys' as const, label: 'API 密钥' },
  { id: 'policy' as const, label: '安全策略' },
  { id: 'logs' as const, label: '安全日志' },
]
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">安全中心</h1>
        <p class="text-white/40 text-sm mt-1">管理 API 密钥、安全策略配置与安全事件审计日志</p>
      </div>
      <button
        @click="handleRefresh"
        :disabled="loading"
        class="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
      >
        <span :class="{ 'animate-spin': loading }">
          <span class="i-lucide-refresh-cw text-xs"></span>
        </span>
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <!-- KPI -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white/[0.04] p-7 rounded-2xl relative group overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-blue-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">密钥数量</div>
        <div class="text-4xl font-bold tracking-tight text-white font-mono relative z-10">{{ keys.length }}</div>
        <div class="text-xs text-white/30 mt-2">已签发密钥</div>
      </div>
      <div class="bg-white/[0.04] p-7 rounded-2xl relative group overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-emerald-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">速率限制</div>
        <div class="text-4xl font-bold tracking-tight font-mono relative z-10"
          :class="policy?.rate_limit?.enabled ? 'text-[#30d158]' : 'text-white/30'">
          {{ policy?.rate_limit?.enabled ? '已启用' : '未启用' }}
        </div>
        <div class="text-xs text-white/30 mt-2">限流: {{ policy?.rate_limit?.max_requests || 0 }} req / {{ policy?.rate_limit?.window_seconds || 0 }}s</div>
      </div>
      <div class="bg-white/[0.04] p-7 rounded-2xl relative group overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-red-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">安全事件</div>
        <div class="text-4xl font-bold tracking-tight text-[#ff453a] font-mono relative z-10">{{ logs.length }}</div>
        <div class="text-xs text-white/30 mt-2">最近安全事件</div>
      </div>
    </div>

    <!-- 子 Tab -->
    <div class="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
      <button
        v-for="s in sections" :key="s.id"
        @click="activeSection = s.id"
        class="px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
        :class="activeSection === s.id
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-white/60 hover:text-white/90 bg-transparent'"
      >{{ s.label }}</button>
    </div>

    <!-- API 密钥列表 -->
    <div v-if="activeSection === 'keys'" class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-white/[0.005]">
              <th class="px-6 py-4 font-semibold font-mono">密钥名称</th>
              <th class="px-6 py-4 font-semibold font-mono">前缀</th>
              <th class="px-6 py-4 font-semibold font-mono">权限</th>
              <th class="px-6 py-4 font-semibold font-mono">状态</th>
              <th class="px-6 py-4 font-semibold font-mono">最后使用</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="k in keys" :key="k.id" class="hover:bg-white/[0.02] transition-colors">
              <td class="px-6 py-5 text-white/90 font-light">{{ k.name }}</td>
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ k.key_prefix }}...</td>
              <td class="px-6 py-5 text-white/50 text-xs">{{ (k.permissions || []).join(', ') || '*' }}</td>
              <td class="px-6 py-5">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
                  :class="k.is_active ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20' : 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20'">
                  {{ k.is_active ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="px-6 py-5 text-white/30 font-mono text-xs">{{ k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '从未使用' }}</td>
            </tr>
            <tr v-if="!keys.length">
              <td colspan="5" class="py-12 text-center text-xs text-white/25 font-light">暂无 API 密钥</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 安全策略 -->
    <div v-else-if="activeSection === 'policy'" class="space-y-4">
      <div class="bg-white/[0.04] rounded-2xl p-7 space-y-4 shadow-lg shadow-black/20">
        <h3 class="text-xs font-semibold text-white/60 uppercase tracking-widest font-mono">当前安全策略配置</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
            <div class="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-mono">速率限制</div>
            <div class="text-xs text-white/80">
              {{ policy?.rate_limit?.enabled ? `启用 - ${policy.rate_limit.max_requests} 次 / ${policy.rate_limit.window_seconds}s` : '未启用' }}
            </div>
          </div>
          <div class="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
            <div class="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-mono">IP 策略</div>
            <div class="text-xs text-white/80">{{ policy?.ip_policy?.mode || '未启用' }}</div>
          </div>
          <div class="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
            <div class="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-mono">签名验证</div>
            <div class="text-xs" :class="policy?.signature_required ? 'text-[#ff9f0a]' : 'text-[#30d158]'">
              {{ policy?.signature_required ? '强制要求' : '未要求' }}
            </div>
          </div>
          <div class="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
            <div class="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-mono">最近更新</div>
            <div class="text-xs text-white/50 font-mono">{{ policy?.updated_at ? new Date(policy.updated_at).toLocaleString() : '从未修改' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 安全日志 -->
    <div v-else class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-white/[0.005]">
              <th class="px-6 py-4 font-semibold font-mono">事件</th>
              <th class="px-6 py-4 font-semibold font-mono">IP</th>
              <th class="px-6 py-4 font-semibold font-mono">详情</th>
              <th class="px-6 py-4 font-semibold font-mono">时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="log in logs.slice(0, 50)" :key="log.id" class="hover:bg-white/[0.02] transition-colors">
              <td class="px-6 py-5 text-white/90 font-mono text-xs">{{ log.action }}</td>
              <td class="px-6 py-5 text-white/30 font-mono text-xs">{{ log.ip || '-' }}</td>
              <td class="px-6 py-5 text-white/50 text-xs max-w-xs truncate">{{ JSON.stringify(log.metadata || {}) }}</td>
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ new Date(log.created_at).toLocaleString() }}</td>
            </tr>
            <tr v-if="!logs.length">
              <td colspan="4" class="py-12 text-center text-xs text-white/25 font-light">暂无安全事件日志</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
