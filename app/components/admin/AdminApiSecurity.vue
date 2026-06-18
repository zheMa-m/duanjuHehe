<script setup lang="ts">
// ── 类型定义 ──────────────────────────────────────────────────
interface Policy {
  rate_limit: { enabled: boolean; window_seconds: number; max_requests: number; by_api_key: boolean; by_ip: boolean }
  ip_policy: { mode: 'disabled' | 'whitelist' | 'blacklist'; whitelist: string[]; blacklist: string[] }
  country_policy: { enabled: boolean; mode: 'whitelist' | 'blacklist'; countries: string[] }
  signature_required: boolean
  endpoint_overrides: Record<string, { enabled?: boolean; rateLimit?: number }>
  updated_at: string | null
}

interface ApiKey {
  id: string; name: string; key_prefix: string; permissions: string[]
  allowed_endpoints: string[] | null; rate_limit_override: number | null
  require_signature: boolean; is_active: boolean; last_used_at: string | null
  expires_at: string | null; created_at: string; updated_at: string
  apiKey?: string; signingSecret?: string
}

interface SecurityLog {
  id: number; action: string; ip: string | null; metadata: Record<string, any>; created_at: string
}

const emit = defineEmits<{ toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

// ── 子 tab ──────────────────────────────────────────────────
const subTab = ref('rate')
const subTabs = [
  { key: 'rate', label: '速率限制', icon: '⚡' },
  { key: 'ip', label: 'IP 控制', icon: '🌐' },
  { key: 'country', label: '国家限制', icon: '🗺️' },
  { key: 'keys', label: 'API Key', icon: '🔑' },
  { key: 'endpoints', label: '端点覆盖', icon: '🔗' },
  { key: 'logs', label: '安全日志', icon: '📋' },
]

// ── 数据状态 ──────────────────────────────────────────────────
const policy = ref<Policy | null>(null)
const keys = ref<ApiKey[]>([])
const logs = ref<SecurityLog[]>([])
const isLoading = ref(false)
const isSaving = ref(false)

// ── 加载数据 ──────────────────────────────────────────────────
const loadPolicy = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: Policy }>('/api/admin/security/policy')
    policy.value = res.data
  } catch (e: any) { emit('toast', '加载安全策略失败: ' + (e.message || ''), 'error') }
}

const loadKeys = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: ApiKey[] }>('/api/admin/security/keys')
    keys.value = res.data || []
  } catch (e: any) { emit('toast', '加载 API Key 列表失败', 'error') }
}

const loadLogs = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: SecurityLog[] }>('/api/admin/security/logs')
    logs.value = res.data || []
  } catch (e: any) { emit('toast', '加载安全日志失败', 'error') }
}

onMounted(async () => {
  isLoading.value = true
  await Promise.all([loadPolicy(), loadKeys(), loadLogs()])
  isLoading.value = false
})

// ── 保存策略 ──────────────────────────────────────────────────
const savePolicy = async (patch: Partial<Policy>) => {
  if (!policy.value) return
  isSaving.value = true
  try {
    await $fetch('/api/admin/security/policy', { method: 'PATCH', body: patch })
    await loadPolicy()
    emit('toast', '安全策略已更新', 'success')
  } catch (e: any) { emit('toast', '策略更新失败: ' + (e.data?.statusMessage || e.message || ''), 'error') }
  finally { isSaving.value = false }
}

// ── 速率限制 ──────────────────────────────────────────────────
const rateForm = computed(() => policy.value?.rate_limit || { enabled: false, window_seconds: 60, max_requests: 100, by_api_key: true, by_ip: true })
const saveRate = () => savePolicy({ rate_limit: { ...rateForm.value } })

// ── IP 策略 ──────────────────────────────────────────────────
const ipMode = computed(() => policy.value?.ip_policy.mode || 'disabled')
const ipWhitelistText = computed(() => (policy.value?.ip_policy.whitelist || []).join('\n'))
const ipBlacklistText = computed(() => (policy.value?.ip_policy.blacklist || []).join('\n'))

const saveIp = () => {
  const mode = ipMode.value
  const whitelist = ipWhitelistText.value.split('\n').map(s => s.trim()).filter(Boolean)
  const blacklist = ipBlacklistText.value.split('\n').map(s => s.trim()).filter(Boolean)
  savePolicy({ ip_policy: { mode: mode as any, whitelist, blacklist } })
}

// ── 国家策略 ──────────────────────────────────────────────────
const countryEnabled = computed(() => policy.value?.country_policy.enabled || false)
const countryMode = computed(() => policy.value?.country_policy.mode || 'blacklist')
const countryText = computed(() => (policy.value?.country_policy.countries || []).join(', '))

const saveCountry = () => {
  const countries = countryText.value.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(s => s.length === 2)
  savePolicy({ country_policy: { enabled: countryEnabled.value, mode: countryMode.value as any, countries } })
}

// ── 签名全局开关 ──────────────────────────────────────────────
const sigRequired = computed(() => policy.value?.signature_required || false)
const saveSig = () => savePolicy({ signature_required: sigRequired.value })

// ── API Key CRUD ──────────────────────────────────────────────
const showCreateKeyModal = ref(false)
const showKeyResultModal = ref(false)
const newKeyName = ref('')
const newKeyPerms = ref<string[]>(['read'])
const newKeySig = ref(false)
const createdKeyResult = ref<ApiKey | null>(null)

const createKey = async () => {
  if (!newKeyName.value.trim()) return
  try {
    const res = await $fetch<{ success: boolean; data: ApiKey }>('/api/admin/security/keys', {
      method: 'POST',
      body: { name: newKeyName.value.trim(), permissions: newKeyPerms.value, require_signature: newKeySig.value },
    })
    createdKeyResult.value = res.data
    showCreateKeyModal.value = false
    showKeyResultModal.value = true
    newKeyName.value = ''
    newKeyPerms.value = ['read']
    newKeySig.value = false
    await loadKeys()
  } catch (e: any) { emit('toast', '创建 API Key 失败: ' + (e.data?.statusMessage || e.message || ''), 'error') }
}

const revokeKey = async (key: ApiKey) => {
  if (!confirm(`确定要吊销 API Key「${key.name}」(${key.key_prefix}...) 吗？\n此操作不可恢复。`)) return
  try {
    await $fetch(`/api/admin/security/keys/${key.id}`, { method: 'DELETE' })
    await loadKeys()
    emit('toast', 'API Key 已吊销', 'success')
  } catch (e: any) { emit('toast', '吊销失败: ' + (e.data?.statusMessage || e.message || ''), 'error') }
}

const toggleKeyActive = async (key: ApiKey) => {
  try {
    await $fetch(`/api/admin/security/keys/${key.id}`, { method: 'PATCH', body: { is_active: !key.is_active } })
    await loadKeys()
    emit('toast', key.is_active ? 'Key 已停用' : 'Key 已启用', 'success')
  } catch (e: any) { emit('toast', '操作失败', 'error') }
}

// ── 端点覆盖 ──────────────────────────────────────────────────
const newEndpointKey = ref('')
const newEndpointEnabled = ref(true)
const newEndpointRate = ref<number | null>(null)

const addEndpointOverride = () => {
  if (!newEndpointKey.value.trim() || !policy.value) return
  const overrides = { ...policy.value.endpoint_overrides }
  overrides[newEndpointKey.value.trim()] = { enabled: newEndpointEnabled.value, rateLimit: newEndpointRate.value || undefined }
  savePolicy({ endpoint_overrides: overrides })
  newEndpointKey.value = ''
  newEndpointRate.value = null
}

const removeEndpointOverride = (key: string) => {
  if (!policy.value) return
  const overrides = { ...policy.value.endpoint_overrides }
  delete overrides[key]
  savePolicy({ endpoint_overrides: overrides })
}

// ── 辅助 ──────────────────────────────────────────────────────
const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); emit('toast', '已复制到剪贴板', 'success') } catch { emit('toast', '复制失败', 'error') }
}

const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString() : '-'
const codeLabel = (action: string) => action.replace('api_security_', '').toUpperCase()

const refreshAll = async () => {
  isLoading.value = true
  await Promise.all([loadPolicy(), loadKeys(), loadLogs()])
  isLoading.value = false
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题栏 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">API 安全策略</h1>
        <p class="text-white/40 text-sm mt-1">动态管理 REST API 安全配置：速率限制、IP/国家控制、API Key、请求验签</p>
      </div>
      <button @click="refreshAll"
        :disabled="isLoading"
        class="text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5">
        <span :class="{'animate-spin': isLoading}">🔄</span>刷新
      </button>
    </div>

    <!-- 子 tab 导航 -->
    <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-full shadow-[inset_0_1px_rgba(255,255,255,0.02)] flex-wrap gap-0.5">
      <button v-for="t in subTabs" :key="t.key" @click="subTab = t.key"
        class="text-[11px] font-semibold px-4 py-2.5 rounded-full transition-all cursor-pointer focus:outline-none border-0"
        :class="subTab === t.key ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_rgba(255,255,255,0.05)]' : 'bg-transparent text-white/60 hover:text-white/90'">
        {{ t.icon }} {{ t.label }}
      </button>
    </div>

    <!-- ═══ 速率限制 ═══ -->
    <div v-if="subTab === 'rate' && policy" class="space-y-6">
      <div class="bg-white/[0.04] rounded-2xl p-6 space-y-5 shadow-lg shadow-black/20">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-white">速率限制</h2>
          <label class="flex items-center gap-2 cursor-pointer">
            <span class="text-[10px] text-white/50">{{ rateForm.enabled ? '已启用' : '已禁用' }}</span>
            <div @click="rateForm.enabled = !rateForm.enabled" class="w-10 h-5 rounded-full transition-all cursor-pointer relative"
              :class="rateForm.enabled ? 'bg-[#30d158]' : 'bg-white/10'">
              <div class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" :class="rateForm.enabled ? 'left-5.5' : 'left-0.5'"></div>
            </div>
          </label>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">窗口时长（秒）</label>
            <input v-model.number="rateForm.window_seconds" type="number" min="1" max="86400"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">最大请求数</label>
            <input v-model.number="rateForm.max_requests" type="number" min="1" max="100000"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
          </div>
        </div>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer text-xs text-white/60">
            <input type="checkbox" v-model="rateForm.by_api_key" class="accent-indigo-500" />按 API Key 维度
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-sm text-white/60">
            <input type="checkbox" v-model="rateForm.by_ip" class="accent-indigo-500" />按 IP 维度
          </label>
        </div>
        <button @click="saveRate" :disabled="isSaving"
          class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white px-6 py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.15)] disabled:opacity-50">
          {{ isSaving ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </div>

    <!-- ═══ IP 控制 ═══ -->
    <div v-if="subTab === 'ip' && policy" class="space-y-6">
      <div class="bg-white/[0.04] rounded-2xl p-6 space-y-5 shadow-lg shadow-black/20">
        <h2 class="text-sm font-semibold text-white">IP 访问控制</h2>
        <div class="flex gap-2">
          <button v-for="m in [{k:'disabled',l:'禁用'},{k:'whitelist',l:'白名单'},{k:'blacklist',l:'黑名单'}]" :key="m.k"
            @click="(policy!.ip_policy.mode as string) = m.k"
            class="text-[10px] font-semibold px-4 py-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none"
            :class="ipMode === m.k ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.05]'">
            {{ m.l }}
          </button>
        </div>
        <div v-if="ipMode !== 'disabled'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-if="ipMode === 'whitelist'">
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">白名单 IP（每行一个）</label>
            <textarea v-model="(policy!.ip_policy as any).whitelist" rows="6" placeholder="192.168.1.1&#10;10.0.0.0/8"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
              @input="($event: any) => { const lines = $event.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean); policy!.ip_policy.whitelist = lines }" />
          </div>
          <div v-if="ipMode === 'blacklist'">
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">黑名单 IP（每行一个）</label>
            <textarea v-model="(policy!.ip_policy as any).blacklist" rows="6" placeholder="203.0.113.0&#10;198.51.100.0/24"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
              @input="($event: any) => { const lines = $event.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean); policy!.ip_policy.blacklist = lines }" />
          </div>
        </div>
        <button @click="saveIp" :disabled="isSaving"
          class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white px-6 py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.15)] disabled:opacity-50">
          {{ isSaving ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </div>

    <!-- ═══ 国家限制 ═══ -->
    <div v-if="subTab === 'country' && policy" class="space-y-6">
      <div class="bg-white/[0.04] rounded-2xl p-6 space-y-5 shadow-lg shadow-black/20">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-white">国家限制</h2>
          <label class="flex items-center gap-2 cursor-pointer">
            <span class="text-[10px] text-white/50">{{ countryEnabled ? '已启用' : '已禁用' }}</span>
            <div @click="(policy!.country_policy.enabled as boolean) = !countryEnabled" class="w-10 h-5 rounded-full transition-all cursor-pointer relative"
              :class="countryEnabled ? 'bg-[#30d158]' : 'bg-white/10'">
              <div class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" :class="countryEnabled ? 'left-5.5' : 'left-0.5'"></div>
            </div>
          </label>
        </div>
        <div class="flex gap-2">
          <button v-for="m in [{k:'blacklist',l:'黑名单（阻止）'},{k:'whitelist',l:'白名单（仅允许）'}]" :key="m.k"
            @click="(policy!.country_policy.mode as string) = m.k"
            class="text-[10px] font-semibold px-4 py-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none"
            :class="countryMode === m.k ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.05]'">
            {{ m.l }}
          </button>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">国家代码（ISO 3166，逗号分隔）</label>
          <textarea v-model="(policy!.country_policy as any).countries" rows="3" placeholder="CN, US, RU, KP"
            class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
            @input="($event: any) => { policy!.country_policy.countries = $event.target.value.split(/[,\s]+/).map((s: string) => s.trim().toUpperCase()).filter((s: string) => s.length === 2) }" />
        </div>
        <button @click="saveCountry" :disabled="isSaving"
          class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white px-6 py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.15)] disabled:opacity-50">
          {{ isSaving ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </div>

    <!-- ═══ API Key 管理 ═══ -->
    <div v-if="subTab === 'keys'" class="space-y-6">
      <!-- 全局签名开关 -->
      <div class="bg-white/[0.04] rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-black/20">
        <div>
          <div class="text-sm font-semibold text-white">全局签名验证（HMAC-SHA256）</div>
          <div class="text-[10px] text-white/40 mt-1">启用后所有 API Key 默认需要请求签名（per-key 可单独覆盖）</div>
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <span class="text-[10px] text-white/50">{{ sigRequired ? '已启用' : '已禁用' }}</span>
          <div @click="(policy!.signature_required as boolean) = !sigRequired; saveSig()" class="w-10 h-5 rounded-full transition-all cursor-pointer relative"
            :class="sigRequired ? 'bg-[#30d158]' : 'bg-white/10'">
            <div class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" :class="sigRequired ? 'left-5.5' : 'left-0.5'"></div>
          </div>
        </label>
      </div>

      <!-- Key 列表 -->
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-semibold text-white">API Key 列表</h2>
        <button @click="showCreateKeyModal = true"
          class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white px-4 py-2 rounded-full transition-all active:scale-[0.97] cursor-pointer">
          + 创建 Key
        </button>
      </div>

      <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-white/[0.005]">
                <th class="px-5 py-3.5 font-semibold font-mono">名称</th>
                <th class="px-5 py-3.5 font-semibold font-mono">Key 前缀</th>
                <th class="px-5 py-3.5 font-semibold font-mono">权限</th>
                <th class="px-5 py-3.5 font-semibold font-mono">签名</th>
                <th class="px-5 py-3.5 font-semibold font-mono">状态</th>
                <th class="px-5 py-3.5 font-semibold font-mono">最后使用</th>
                <th class="px-5 py-3.5 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in keys" :key="key.id" class="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td class="px-5 py-5 text-white/90 font-medium">{{ key.name }}</td>
                <td class="px-5 py-5 text-white/50 font-mono text-xs">{{ key.key_prefix }}...</td>
                <td class="px-5 py-5">
                  <span v-for="p in key.permissions" :key="p" class="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60 mr-1">{{ p }}</span>
                </td>
                <td class="px-5 py-5">
                  <span :class="key.require_signature ? 'text-[#30d158]' : 'text-white/30'" class="text-xs">{{ key.require_signature ? '✓ 必须' : '可选' }}</span>
                </td>
                <td class="px-5 py-5">
                  <span class="text-[10px] px-2 py-0.5 rounded-full border inline-block"
                    :class="key.is_active ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20' : 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20'">
                    {{ key.is_active ? '活跃' : '停用' }}
                  </span>
                </td>
                <td class="px-5 py-5 text-white/40 font-mono text-xs">{{ fmtDate(key.last_used_at) }}</td>
                <td class="px-5 py-5 text-right">
                  <button @click="toggleKeyActive(key)" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-full border border-white/10 transition-all cursor-pointer mr-1.5">
                    {{ key.is_active ? '停用' : '启用' }}
                  </button>
                  <button @click="revokeKey(key)" class="text-[11px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-4 py-2 rounded-full border border-[#ff453a]/20 transition-all cursor-pointer">
                    吊销
                  </button>
                </td>
              </tr>
              <tr v-if="!keys.length">
                <td colspan="7" class="py-10 text-center text-sm text-white/25">暂无 API Key</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ 端点覆盖 ═══ -->
    <div v-if="subTab === 'endpoints' && policy" class="space-y-6">
      <div class="bg-white/[0.04] rounded-2xl p-6 space-y-5 shadow-lg shadow-black/20">
        <h2 class="text-sm font-semibold text-white">端点覆盖配置</h2>
        <div class="flex gap-3 items-end flex-wrap">
          <div class="flex-1 min-w-[200px]">
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">METHOD:PATH</label>
            <input v-model="newEndpointKey" placeholder="GET:/api/v1/products"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
          </div>
          <div class="w-28">
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">独立速率限制</label>
            <input v-model.number="newEndpointRate" type="number" min="1" placeholder="可选"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
          </div>
          <label class="flex items-center gap-2 cursor-pointer text-xs text-white/60 pb-1">
            <input type="checkbox" v-model="newEndpointEnabled" class="accent-indigo-500" />启用
          </label>
          <button @click="addEndpointOverride"
            class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 text-white px-5 py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer">
            添加
          </button>
        </div>

        <div v-if="Object.keys(policy.endpoint_overrides).length" class="divide-y divide-white/[0.04]">
          <div v-for="(cfg, epKey) in policy.endpoint_overrides" :key="epKey" class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-white/80">{{ epKey }}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full border" :class="cfg.enabled !== false ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20' : 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20'">
                {{ cfg.enabled !== false ? '启用' : '禁用' }}
              </span>
              <span v-if="cfg.rateLimit" class="text-[10px] text-white/40">限 {{ cfg.rateLimit }} req/window</span>
            </div>
            <button @click="removeEndpointOverride(epKey as string)" class="text-[11px] text-[#ff453a] hover:text-[#ff453a]/80 cursor-pointer bg-transparent border-0">移除</button>
          </div>
        </div>
        <div v-else class="text-sm text-white/25 py-4 text-center">暂无端点覆盖配置</div>
      </div>
    </div>

    <!-- ═══ 安全日志 ═══ -->
    <div v-if="subTab === 'logs'" class="space-y-6">
      <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-white/[0.005]">
                <th class="px-5 py-3.5 font-semibold font-mono">时间</th>
                <th class="px-5 py-3.5 font-semibold font-mono">事件</th>
                <th class="px-5 py-3.5 font-semibold font-mono">IP</th>
                <th class="px-5 py-3.5 font-semibold font-mono">路径</th>
                <th class="px-5 py-3.5 font-semibold font-mono">详情</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id" class="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td class="px-5 py-5 text-white/40 font-mono text-xs whitespace-nowrap">{{ fmtDate(log.created_at) }}</td>
                <td class="px-5 py-5">
                  <span class="text-[10px] px-2 py-0.5 rounded-full border bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20 font-mono">{{ codeLabel(log.action) }}</span>
                </td>
                <td class="px-5 py-5 text-white/50 font-mono text-xs">{{ log.ip || '-' }}</td>
                <td class="px-5 py-5 text-white/50 font-mono text-xs">{{ log.metadata?.path || '-' }}</td>
                <td class="px-5 py-5 text-white/30 text-xs max-w-[200px] truncate">{{ JSON.stringify(log.metadata || {}) }}</td>
              </tr>
              <tr v-if="!logs.length">
                <td colspan="5" class="py-10 text-center text-sm text-white/25">暂无安全事件记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ 创建 Key 弹窗 ═══ -->
    <Teleport to="body">
      <div v-if="showCreateKeyModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showCreateKeyModal = false">
        <div class="bg-[#12121a] rounded-2xl shadow-2xl shadow-black/40 w-full max-w-md p-6 space-y-5 animate-fade-in">
          <div class="flex justify-between items-center">
            <h2 class="text-white text-sm font-semibold">创建 API Key</h2>
            <button @click="showCreateKeyModal = false" class="text-white/40 hover:text-white text-lg cursor-pointer bg-transparent border-0">×</button>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">名称</label>
            <input v-model="newKeyName" maxlength="100" placeholder="我的集成"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">权限</label>
            <div class="flex gap-2">
              <button v-for="p in ['read','write','admin']" :key="p" type="button"
                @click="newKeyPerms.includes(p) ? newKeyPerms = newKeyPerms.filter(x => x !== p) : newKeyPerms.push(p)"
                class="flex-1 text-[11px] py-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none"
                :class="newKeyPerms.includes(p) ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-white/[0.03] text-white/50 border-white/[0.08]'">
                {{ p }}
              </button>
            </div>
          </div>
          <label class="flex items-center gap-2 cursor-pointer text-sm text-white/60">
            <input type="checkbox" v-model="newKeySig" class="accent-indigo-500" />要求请求签名（HMAC-SHA256）
          </label>
          <button @click="createKey"
            class="w-full text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer">
            创建
          </button>
        </div>
      </div>
    </Teleport>

    <!-- ═══ 一次性密钥展示弹窗 ═══ -->
    <Teleport to="body">
      <div v-if="showKeyResultModal && createdKeyResult" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showKeyResultModal = false">
        <div class="bg-[#12121a] rounded-2xl shadow-2xl shadow-black/40 w-full max-w-lg p-6 space-y-5 animate-fade-in">
          <div class="flex justify-between items-center">
            <h2 class="text-white text-sm font-semibold">🔑 API Key 已创建</h2>
            <button @click="showKeyResultModal = false" class="text-white/40 hover:text-white text-lg cursor-pointer bg-transparent border-0">×</button>
          </div>
          <div class="bg-[#ff9f0a]/10 border border-[#ff9f0a]/20 rounded-xl px-4 py-3 text-sm text-[#ff9f0a]">
            ⚠️ 请立即复制以下密钥，关闭窗口后将无法再次查看！
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">API Key</label>
            <div class="flex items-center gap-2">
              <code class="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#30d158] font-mono break-all select-all">{{ createdKeyResult.apiKey }}</code>
              <button @click="copyText(createdKeyResult.apiKey!)" class="text-[11px] bg-white/10 hover:bg-white/15 text-white px-3 py-2.5 rounded-xl cursor-pointer transition-all border-0">复制</button>
            </div>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">签名密钥（Signing Secret）</label>
            <div class="flex items-center gap-2">
              <code class="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#bf5af2] font-mono break-all select-all">{{ createdKeyResult.signingSecret }}</code>
              <button @click="copyText(createdKeyResult.signingSecret!)" class="text-[11px] bg-white/10 hover:bg-white/15 text-white px-3 py-2.5 rounded-xl cursor-pointer transition-all border-0">复制</button>
            </div>
          </div>
          <button @click="showKeyResultModal = false"
            class="w-full text-sm font-semibold bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl transition-all cursor-pointer">
            我已保存，关闭窗口
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
