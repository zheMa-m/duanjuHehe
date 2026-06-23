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

interface LogsResponse {
  items: SecurityLog[]
  pagination: { page: number; pageSize: number; total: number }
}

interface OverviewData {
  score: number
  grade: string
  gradeLabel: string
  scoreDetails: string[]
  stats: { todayBlocked: number; activeThreats: number; totalKeys: number; activeKeys: number }
  configStatus: { rate_limit: boolean; ip_policy_mode: string; country_policy: boolean; signature_required: boolean; endpoint_overrides_count: number }
  keys: { expired: { id: string; name: string; key_prefix: string; expires_at: string }[]; expiringSoon: { id: string; name: string; key_prefix: string; expires_at: string }[] }
  recentThreats: { id: number; action: string; ip: string | null; metadata: Record<string, any>; created_at: string }[]
  rateLimitTop: { topIps: { ip: string; count: number }[]; topKeys: { keyPrefix: string; count: number }[] }
}

const emit = defineEmits<{ toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

// ── 子 tab ──────────────────────────────────────────────────
const subTab = ref('overview')
const subTabs = [
  { key: 'overview', label: '概览', iconClass: 'i-lucide-bar-chart-3' },
  { key: 'rate', label: '速率限制', iconClass: 'i-lucide-zap' },
  { key: 'ip', label: 'IP 控制', iconClass: 'i-lucide-globe' },
  { key: 'country', label: '国家限制', iconClass: 'i-lucide-map' },
  { key: 'keys', label: 'API Key', iconClass: 'i-lucide-key' },
  { key: 'endpoints', label: '端点覆盖', iconClass: 'i-lucide-link' },
  { key: 'logs', label: '安全日志', iconClass: 'i-lucide-clipboard-list' },
  { key: 'twofa', label: '双因素认证', iconClass: 'i-lucide-smartphone' },
]

// ── 数据状态 ──────────────────────────────────────────────────
const policy = ref<Policy | null>(null)
const keys = ref<ApiKey[]>([])

// API Key 分页 + 搜索
const keysPage = ref(1)
const keysPageSize = ref(50)
const keysTotal = ref(0)
const keysSearch = ref('')

const keysTotalPages = computed(() => Math.max(1, Math.ceil(keysTotal.value / keysPageSize.value)))
const logs = ref<SecurityLog[]>([])
const isLoading = ref(false)
const isSaving = ref(false)

// 安全日志分页 + 筛选
const logsPage = ref(1)
const logsPageSize = ref(30)
const logsTotal = ref(0)
const logEventFilter = ref('')
const logDateFrom = ref('')
const logDateTo = ref('')

const logTotalPages = computed(() => Math.max(1, Math.ceil(logsTotal.value / logsPageSize.value)))

// 安全事件类型选项
const eventTypeOptions = [
  { value: '', label: '全部类型' },
  { value: 'IP_BLOCKED', label: 'IP 封禁' },
  { value: 'IP_NOT_ALLOWED', label: 'IP 白名单拒绝' },
  { value: 'COUNTRY_BLOCKED', label: '国家封禁' },
  { value: 'COUNTRY_NOT_ALLOWED', label: '国家白名单拒绝' },
  { value: 'INVALID_API_KEY', label: '无效 API Key' },
  { value: 'ENDPOINT_NOT_ALLOWED', label: '端点无权限' },
  { value: 'ENDPOINT_DISABLED', label: '端点已禁用' },
  { value: 'SIGNATURE_MISSING', label: '签名缺失' },
  { value: 'INVALID_SIGNATURE', label: '签名无效' },
  { value: 'RATE_LIMITED', label: '速率限制' },
]

const handleLogsPageChange = (page: number) => {
  if (page < 1 || page > logTotalPages.value) return
  logsPage.value = page
  loadLogs()
}

const applyLogFilters = () => {
  logsPage.value = 1
  loadLogs()
}

const resetLogFilters = () => {
  logEventFilter.value = ''
  logDateFrom.value = ''
  logDateTo.value = ''
  logsPage.value = 1
  loadLogs()
}

// ── 安全概览（从服务端聚合接口获取真实数据） ──────────────────
const overview = ref<OverviewData | null>(null)

const securityScore = computed(() => overview.value?.score ?? 0)

const scoreGrade = computed(() => {
  const s = securityScore.value
  if (s >= 80) return { label: '优秀', color: 'text-[#30d158]', bg: 'bg-[#30d158]/10', border: 'border-[#30d158]/20' }
  if (s >= 60) return { label: '良好', color: 'text-[#ff9f0a]', bg: 'bg-[#ff9f0a]/10', border: 'border-[#ff9f0a]/20' }
  return { label: '需改进', color: 'text-[#ff453a]', bg: 'bg-[#ff453a]/10', border: 'border-[#ff453a]/20' }
})

const activeThreatsCount = computed(() => overview.value?.stats.activeThreats ?? 0)
const todayBlockedCount = computed(() => overview.value?.stats.todayBlocked ?? 0)
const activeKeysCount = computed(() => overview.value?.stats.activeKeys ?? 0)
const recentThreats = computed(() => overview.value?.recentThreats ?? [])
const expiredKeys = computed(() => overview.value?.keys.expired ?? [])
const expiringSoonKeys = computed(() => overview.value?.keys.expiringSoon ?? [])
const overviewRateTop = computed(() => overview.value?.rateLimitTop ?? { topIps: [], topKeys: [] })
const configStatus = computed(() => overview.value?.configStatus)

const loadOverview = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: OverviewData }>('/api/admin/security/overview')
    overview.value = res.data
  } catch (e: any) { /* overview 加载失败不阻塞其他数据 */ }
}

// ── 日志严重级别 ──────────────────────────────────────────────
const logSeverity = (action: string) => {
  if (action.includes('INVALID_SIGNATURE') || action.includes('SIGNATURE_MISSING')) return 'high'
  if (action.includes('BLOCKED') || action.includes('NOT_ALLOWED') || action.includes('DISABLED')) return 'medium'
  if (action.includes('INVALID_API_KEY')) return 'medium'
  if (action.includes('RATE_LIMITED')) return 'low'
  return 'info'
}

const severityStyle = (action: string) => {
  const s = logSeverity(action)
  if (s === 'high') return 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20'
  if (s === 'medium') return 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20'
  if (s === 'low') return 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
  return 'bg-white/5 text-white/40 border-white/10'
}

const daysUntilExpiry = (dateStr: string | null) => {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── 加载数据 ──────────────────────────────────────────────────
const loadPolicy = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: Policy }>('/api/admin/security/policy')
    policy.value = res.data
  } catch (e: any) { emit('toast', '加载安全策略失败: ' + (e.message || ''), 'error') }
}

const loadKeys = async () => {
  try {
    const params = new URLSearchParams()
    params.set('page', String(keysPage.value))
    params.set('pageSize', String(keysPageSize.value))
    if (keysSearch.value) params.set('search', keysSearch.value)
    const res = await $fetch<{ success: boolean; data: { items: ApiKey[]; pagination: { page: number; pageSize: number; total: number } } }>(`/api/admin/security/keys?${params}`)
    keys.value = res.data.items || []
    keysTotal.value = res.data.pagination?.total ?? 0
  } catch (e: any) { emit('toast', '加载 API Key 列表失败', 'error') }
}

const handleKeysPageChange = (page: number) => {
  if (page < 1 || page > keysTotalPages.value) return
  keysPage.value = page
  loadKeys()
}

const searchKeys = () => {
  keysPage.value = 1
  loadKeys()
}

const loadLogs = async () => {
  try {
    const params = new URLSearchParams()
    params.set('page', String(logsPage.value))
    params.set('pageSize', String(logsPageSize.value))
    if (logEventFilter.value) params.set('eventType', logEventFilter.value)
    if (logDateFrom.value) params.set('from', new Date(logDateFrom.value).toISOString())
    if (logDateTo.value) params.set('to', new Date(logDateTo.value).toISOString())
    const res = await $fetch<{ success: boolean; data: LogsResponse }>(`/api/admin/security/logs?${params}`)
    logs.value = res.data.items || []
    logsTotal.value = res.data.pagination?.total ?? 0
  } catch (e: any) { emit('toast', '加载安全日志失败', 'error') }
}

onMounted(async () => {
  isLoading.value = true
  await Promise.all([loadPolicy(), loadKeys(), loadLogs(), loadOverview(), loadTwoFAStatus()])
  isLoading.value = false
})

// ── 保存策略 ──────────────────────────────────────────────────
const savePolicy = async (patch: Partial<Policy>) => {
  if (!policy.value) return
  isSaving.value = true
  try {
    await $fetch('/api/admin/security/policy', { method: 'PATCH', body: patch })
    await Promise.all([loadPolicy(), loadOverview()])
    emit('toast', '安全策略已更新', 'success')
  } catch (e: any) { emit('toast', '策略更新失败: ' + (e.data?.statusMessage || e.message || ''), 'error') }
  finally { isSaving.value = false }
}

// ── 速率限制 ──────────────────────────────────────────────────
const rateForm = computed(() => policy.value?.rate_limit || { enabled: false, window_seconds: 60, max_requests: 100, by_api_key: true, by_ip: true })

const clampRateLimit = () => {
  if (!policy.value) return
  if (rateForm.value.window_seconds < 1) policy.value.rate_limit.window_seconds = 1
  if (rateForm.value.window_seconds > 86400) policy.value.rate_limit.window_seconds = 86400
  if (rateForm.value.max_requests < 1) policy.value.rate_limit.max_requests = 1
  if (rateForm.value.max_requests > 100000) policy.value.rate_limit.max_requests = 100000
}

const saveRate = () => {
  clampRateLimit()
  savePolicy({ rate_limit: { ...rateForm.value } })
}

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
  if (!newKeyName.value.trim()) {
    emit('toast', '请输入 Key 名称', 'error')
    return
  }
  if (newKeyPerms.value.length === 0) {
    emit('toast', '请至少选择一个权限', 'error')
    return
  }
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

// ── 日志导出 ──────────────────────────────────────────────────
const { isExporting: isExportingLogs, exportCSV } = useExport()
const exportLogs = async () => {
  try {
    const params: Record<string, string> = {}
    if (logEventFilter.value) params.eventType = logEventFilter.value
    if (logDateFrom.value) params.from = new Date(logDateFrom.value).toISOString()
    if (logDateTo.value) params.to = new Date(logDateTo.value).toISOString()
    await exportCSV('/api/admin/security/logs/export', params, `security-logs-${new Date().toISOString().slice(0, 10)}.csv`)
    emit('toast', '日志导出已开始', 'success')
  } catch { emit('toast', '导出失败', 'error') }
}

// ── 2FA ────────────────────────────────────────────────────────
interface TwoFAStatus {
  enabled: boolean
  verifiedAt: string | null
  createdAt: string | null
}

const twoFAStatus = ref<TwoFAStatus | null>(null)
const twoFASetupData = ref<{ secret: string; qrCode: string; backupCodes: string[] } | null>(null)
const twoFASetupCode = ref('')
const twoFADisableCode = ref('')
const twoFASaving = ref(false)
const twoFAShowSetup = ref(false)
const twoFAShowDisable = ref(false)

const loadTwoFAStatus = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: TwoFAStatus }>('/api/admin/auth/2fa/status')
    twoFAStatus.value = res.data
  } catch { /* 2FA 未配置属于正常状态 */ }
}

const handleTwoFASetup = async () => {
  twoFASaving.value = true
  try {
    const res = await $fetch<{ success: boolean; data: { secret: string; qrCode: string; backupCodes: string[] } }>('/api/admin/auth/2fa/setup', { method: 'POST' })
    twoFASetupData.value = res.data
    twoFAShowSetup.value = true
    twoFASetupCode.value = ''
  } catch (e: any) {
    emit('toast', '2FA 设置失败: ' + (e.data?.statusMessage || e.message || ''), 'error')
  } finally { twoFASaving.value = false }
}

const handleTwoFAVerify = async () => {
  if (!twoFASetupCode.value || twoFASetupCode.value.length !== 6) {
    emit('toast', '请输入 6 位验证码', 'error')
    return
  }
  twoFASaving.value = true
  try {
    await $fetch('/api/admin/auth/2fa/verify', { method: 'POST', body: { code: twoFASetupCode.value } })
    emit('toast', '2FA 已启用', 'success')
    twoFAShowSetup.value = false
    twoFASetupData.value = null
    await loadTwoFAStatus()
  } catch (e: any) {
    emit('toast', '验证失败: ' + (e.data?.statusMessage || e.message || ''), 'error')
  } finally { twoFASaving.value = false }
}

const handleTwoFADisable = async () => {
  if (!twoFADisableCode.value) {
    emit('toast', '请输入验证码或恢复码', 'error')
    return
  }
  twoFASaving.value = true
  try {
    await $fetch('/api/admin/auth/2fa/disable', { method: 'POST', body: { code: twoFADisableCode.value } })
    emit('toast', '2FA 已关闭', 'success')
    twoFAShowDisable.value = false
    twoFADisableCode.value = ''
    await loadTwoFAStatus()
  } catch (e: any) {
    emit('toast', '操作失败: ' + (e.data?.statusMessage || e.message || ''), 'error')
  } finally { twoFASaving.value = false }
}

// ── 批量 Key 操作 ─────────────────────────────────────────────
const selectedKeyIds = ref<Set<string>>(new Set())
const allKeysSelected = computed(() =>
  keys.value.length > 0 && keys.value.every(k => selectedKeyIds.value.has(k.id))
)
const toggleSelectKey = (id: string) => {
  const next = new Set(selectedKeyIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedKeyIds.value = next
}
const toggleSelectAllKeys = () => {
  if (allKeysSelected.value) {
    selectedKeyIds.value = new Set()
  } else {
    selectedKeyIds.value = new Set(keys.value.map(k => k.id))
  }
}
const batchRevoking = ref(false)
const batchRevokeKeys = async () => {
  if (selectedKeyIds.value.size === 0) return
  const names = keys.value.filter(k => selectedKeyIds.value.has(k.id)).map(k => k.name).join('、')
  if (!confirm(`确定要批量吊销以下 ${selectedKeyIds.value.size} 个 API Key 吗？\n${names}\n\n此操作不可恢复。`)) return
  batchRevoking.value = true
  try {
    const res = await $fetch<{ success: boolean; data: { successCount: number; failCount: number } }>('/api/admin/security/keys/batch-revoke', {
      method: 'POST',
      body: { ids: [...selectedKeyIds.value] },
    })
    selectedKeyIds.value = new Set()
    await loadKeys()
    emit('toast', `批量吊销完成：${res.data.successCount} 成功，${res.data.failCount} 失败`, res.data.failCount > 0 ? 'error' : 'success')
  } catch (e: any) { emit('toast', '批量吊销失败: ' + (e.data?.statusMessage || e.message || ''), 'error') }
  finally { batchRevoking.value = false }
}

// ── 辅助 ──────────────────────────────────────────────────────
const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); emit('toast', '已复制到剪贴板', 'success') } catch { emit('toast', '复制失败', 'error') }
}

const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString() : '-'
const codeLabel = (action: string) => action.replace('api_security_', '').toUpperCase()

const refreshAll = async () => {
  isLoading.value = true
  await Promise.all([loadPolicy(), loadKeys(), loadLogs(), loadOverview(), loadTwoFAStatus()])
  isLoading.value = false
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题栏 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">安全</h1>
        <p class="text-white/40 text-sm mt-1">API 安全配置中心：概览、速率限制、IP/国家控制、API Key 管理、请求验签、安全日志</p>
      </div>
      <button @click="refreshAll"
        :disabled="isLoading"
        class="text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5">
        <span :class="['i-lucide-refresh-cw text-sm', { 'animate-spin': isLoading }]" />刷新
      </button>
    </div>

    <!-- 子 tab 导航 -->
    <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-full shadow-[inset_0_1px_rgba(255,255,255,0.02)] flex-wrap gap-0.5">
      <button v-for="t in subTabs" :key="t.key" @click="subTab = t.key"
        class="text-[11px] font-semibold px-4 py-2.5 rounded-full transition-all cursor-pointer focus:outline-none border-0 flex items-center gap-1.5"
        :class="subTab === t.key ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_rgba(255,255,255,0.05)]' : 'bg-transparent text-white/60 hover:text-white/90'">
        <span :class="[t.iconClass, 'text-sm']" /> {{ t.label }}
      </button>
    </div>

    <!-- ═══ 安全概览 ═══ -->
    <div v-if="subTab === 'overview'" class="space-y-6">
      <!-- 加载骨架屏 -->
      <template v-if="!overview">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="bg-white/[0.04] rounded-2xl p-5 animate-pulse">
            <div class="h-3 bg-white/[0.06] rounded w-16 mb-2" />
            <div class="h-8 bg-white/[0.06] rounded w-12" />
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-white/[0.04] rounded-2xl p-5 animate-pulse space-y-2">
            <div class="h-3 bg-white/[0.06] rounded w-20" />
            <div v-for="i in 5" :key="i" class="h-5 bg-white/[0.04] rounded" />
          </div>
          <div class="bg-white/[0.04] rounded-2xl p-5 animate-pulse space-y-2">
            <div class="h-3 bg-white/[0.06] rounded w-20" />
            <div v-for="i in 5" :key="i" class="h-5 bg-white/[0.04] rounded" />
          </div>
        </div>
      </template>

      <!-- 安全评分卡片 -->
      <div v-if="overview" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white/[0.04] rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/[0.06]">
          <div class="flex items-center justify-between mb-3">
            <span class="text-[11px] text-white/40 uppercase tracking-widest font-mono">安全评分</span>
            <span class="flex items-center gap-1.5">
              <span :class="['inline-block w-2 h-2 rounded-full', scoreGrade.color.replace('text-', 'bg-')]" />
              <span :class="['text-[10px] font-semibold', scoreGrade.color]">{{ scoreGrade.label }}</span>
            </span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-4xl font-bold text-white tracking-tighter">{{ securityScore }}</span>
            <span class="text-white/30 text-sm">/ 100</span>
          </div>
          <div class="mt-3 w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500"
              :class="securityScore >= 80 ? 'bg-[#30d158]' : securityScore >= 60 ? 'bg-[#ff9f0a]' : 'bg-[#ff453a]'"
              :style="{ width: securityScore + '%' }" />
          </div>
        </div>

        <div class="bg-white/[0.04] rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/[0.06]">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-alert-triangle text-sm text-[#ff9f0a]" />
            <span class="text-[11px] text-white/40 uppercase tracking-widest font-mono">活跃威胁</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-4xl font-bold text-[#ff9f0a] tracking-tighter">{{ activeThreatsCount }}</span>
            <span class="text-white/30 text-sm">个事件</span>
          </div>
        </div>

        <div class="bg-white/[0.04] rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/[0.06]">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-shield text-sm text-[#30d158]" />
            <span class="text-[11px] text-white/40 uppercase tracking-widest font-mono">今日拦截</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-4xl font-bold text-[#30d158] tracking-tighter">{{ todayBlockedCount }}</span>
            <span class="text-white/30 text-sm">次</span>
          </div>
        </div>

        <div class="bg-white/[0.04] rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/[0.06]">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-key text-sm text-indigo-400" />
            <span class="text-[11px] text-white/40 uppercase tracking-widest font-mono">活跃 Key</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-4xl font-bold text-indigo-400 tracking-tighter">{{ activeKeysCount }}</span>
            <span class="text-white/30 text-sm">/ {{ keys.length }}</span>
          </div>
        </div>
      </div>

      <!-- 配置状态面板 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-white/[0.04] rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/[0.06]">
          <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span class="i-lucide-shield-check text-sm text-indigo-400" /> 安全配置状态
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span class="text-xs text-white/60">速率限制</span>
              <span :class="configStatus?.rate_limit ? 'text-[#30d158]' : 'text-[#ff453a]'" class="text-xs font-semibold">
                {{ configStatus?.rate_limit ? '✓ 已启用' : '✗ 未启用' }}
              </span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span class="text-xs text-white/60">IP 访问控制</span>
              <span :class="configStatus?.ip_policy_mode !== 'disabled' ? 'text-[#30d158]' : 'text-[#ff9f0a]'" class="text-xs font-semibold">
                {{ configStatus?.ip_policy_mode === 'whitelist' ? '白名单模式' : configStatus?.ip_policy_mode === 'blacklist' ? '黑名单模式' : '未启用' }}
              </span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span class="text-xs text-white/60">国家限制</span>
              <span :class="configStatus?.country_policy ? 'text-[#30d158]' : 'text-[#ff9f0a]'" class="text-xs font-semibold">
                {{ configStatus?.country_policy ? '✓ 已启用' : '未启用' }}
              </span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span class="text-xs text-white/60">请求签名 (HMAC-SHA256)</span>
              <span :class="configStatus?.signature_required ? 'text-[#30d158]' : 'text-[#ff453a]'" class="text-xs font-semibold">
                {{ configStatus?.signature_required ? '✓ 已启用' : '✗ 未启用' }}
              </span>
            </div>
            <div class="flex items-center justify-between py-2">
              <span class="text-xs text-white/60">端点覆盖</span>
              <span class="text-xs font-semibold text-white/50">{{ configStatus?.endpoint_overrides_count ?? 0 }} 条规则</span>
            </div>
          </div>
        </div>

        <div class="bg-white/[0.04] rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/[0.06]">
          <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span class="i-lucide-clock text-sm text-[#ff9f0a]" /> 最近安全事件
          </h3>
          <div v-if="recentThreats.length" class="space-y-2.5">
            <div v-for="log in recentThreats" :key="log.id"
              class="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
              <span :class="['inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                logSeverity(log.action) === 'high' ? 'bg-[#ff453a]' :
                logSeverity(log.action) === 'medium' ? 'bg-[#ff9f0a]' : 'bg-[#30d158]']" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span :class="['text-[10px] px-1.5 py-0.5 rounded font-mono', severityStyle(log.action)]">{{ codeLabel(log.action) }}</span>
                  <span class="text-[11px] text-white/50 truncate">{{ log.metadata?.path || '-' }}</span>
                </div>
                <div class="text-[10px] text-white/25 font-mono mt-0.5">{{ fmtDate(log.created_at) }}</div>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-white/25 py-6 text-center">暂无安全事件，系统运行正常</div>
        </div>
      </div>

      <!-- API Key 到期提醒 -->
      <div v-if="expiredKeys.length || expiringSoonKeys.length" class="bg-[#ff9f0a]/[0.04] rounded-2xl p-5 border border-[#ff9f0a]/10 shadow-lg shadow-black/20">
        <h3 class="text-sm font-semibold text-[#ff9f0a] mb-3 flex items-center gap-2">
          <span class="i-lucide-clock text-sm" /> Key 到期提醒
        </h3>
        <div class="space-y-2">
          <div v-if="expiredKeys.length" class="flex items-center gap-2 text-xs">
            <span class="text-[#ff453a] font-semibold">{{ expiredKeys.length }} 个已过期</span>
            <span class="text-white/30">—</span>
            <span class="text-white/40">{{ expiredKeys.map(k => k.name).join('、') }}</span>
          </div>
          <div v-if="expiringSoonKeys.length" class="flex items-center gap-2 text-xs">
            <span class="text-[#ff9f0a] font-semibold">{{ expiringSoonKeys.length }} 个即将到期</span>
            <span class="text-white/30">—</span>
            <span class="text-white/40">
              <span v-for="(k, i) in expiringSoonKeys" :key="k.id">
                {{ k.name }}({{ daysUntilExpiry(k.expires_at) }}天){{ i < expiringSoonKeys.length - 1 ? '、' : '' }}
              </span>
            </span>
          </div>
        </div>
      </div>
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

      <!-- Key 搜索 + 创建 -->
      <div class="flex gap-3 items-center">
        <div class="relative flex-1 max-w-xs">
          <input v-model="keysSearch" @keyup.enter="searchKeys" placeholder="搜索 Key 名称..."
            class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">🔍</span>
        </div>
        <button @click="searchKeys"
          class="text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-xl transition-all cursor-pointer">
          搜索
        </button>
        <div class="flex-1"></div>
        <span v-if="keysTotal > 0" class="text-[11px] text-white/30 font-mono">{{ keysTotal }} 个 Key</span>
        <button @click="showCreateKeyModal = true"
          class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white px-4 py-2 rounded-full transition-all active:scale-[0.97] cursor-pointer">
          + 创建 Key
        </button>
      </div>

      <!-- 批量操作栏 -->
      <div v-if="selectedKeyIds.size > 0" class="bg-[#ff9f0a]/[0.06] rounded-2xl px-5 py-3 flex items-center justify-between border border-[#ff9f0a]/10 shadow-lg shadow-black/20">
        <span class="text-sm text-white/70">已选择 <span class="text-[#ff9f0a] font-semibold">{{ selectedKeyIds.size }}</span> 个 Key</span>
        <button @click="batchRevokeKeys" :disabled="batchRevoking"
          class="text-sm font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-4 py-2 rounded-full border border-[#ff453a]/20 transition-all cursor-pointer disabled:opacity-50">
          {{ batchRevoking ? '吊销中...' : '批量吊销' }}
        </button>
      </div>

      <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-white/[0.005]">
                <th class="px-4 py-3.5 w-10">
                  <input type="checkbox" :checked="allKeysSelected" @change="toggleSelectAllKeys" class="accent-indigo-500 cursor-pointer w-3.5 h-3.5" />
                </th>
                <th class="px-5 py-3.5 font-semibold font-mono">名称</th>
                <th class="px-5 py-3.5 font-semibold font-mono">Key 前缀</th>
                <th class="px-5 py-3.5 font-semibold font-mono">权限</th>
                <th class="px-5 py-3.5 font-semibold font-mono">签名</th>
                <th class="px-5 py-3.5 font-semibold font-mono">状态</th>
                <th class="px-5 py-3.5 font-semibold font-mono">到期</th>
                <th class="px-5 py-3.5 font-semibold font-mono">最后使用</th>
                <th class="px-5 py-3.5 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in keys" :key="key.id" class="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td class="px-4 py-5">
                  <input type="checkbox" :checked="selectedKeyIds.has(key.id)" @change="toggleSelectKey(key.id)" class="accent-indigo-500 cursor-pointer w-3.5 h-3.5" />
                </td>
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
                <td class="px-5 py-5">
                  <template v-if="key.expires_at">
                    <span class="text-[10px] px-2 py-0.5 rounded-full border inline-block"
                      :class="daysUntilExpiry(key.expires_at)! <= 0
                        ? 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20'
                        : daysUntilExpiry(key.expires_at)! <= 7
                          ? 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20'
                          : 'bg-white/5 text-white/40 border-white/10'">
                      {{ daysUntilExpiry(key.expires_at)! <= 0 ? '已过期' : daysUntilExpiry(key.expires_at) + '天后' }}
                    </span>
                    <div class="text-[10px] text-white/20 font-mono mt-0.5">{{ fmtDate(key.expires_at) }}</div>
                  </template>
                  <span v-else class="text-white/20 text-xs">-</span>
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
                <td colspan="9" class="py-10 text-center text-sm text-white/25">暂无 API Key</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Key 分页 -->
        <div v-if="keysTotal > 0" class="flex items-center justify-between px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
          <div class="text-[11px] text-white/30 font-mono">共 {{ keysTotal }} 个 · 第 {{ keysPage }}/{{ keysTotalPages }} 页</div>
          <div class="flex items-center gap-2">
            <button @click="handleKeysPageChange(keysPage - 1)" :disabled="keysPage <= 1"
              class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">上一页</button>
            <button @click="handleKeysPageChange(keysPage + 1)" :disabled="keysPage >= keysTotalPages"
              class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">下一页</button>
          </div>
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
      <!-- 筛选栏 -->
      <div class="bg-white/[0.04] rounded-2xl p-5 space-y-4 shadow-lg shadow-black/20">
        <h2 class="text-sm font-semibold text-white">筛选条件</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label class="block text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1">事件类型</label>
            <select v-model="logEventFilter"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all">
              <option v-for="opt in eventTypeOptions" :key="opt.value" :value="opt.value" class="bg-[#12121a] text-white">{{ opt.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1">起始时间</label>
            <input type="datetime-local" v-model="logDateFrom"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
          </div>
          <div>
            <label class="block text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1">结束时间</label>
            <input type="datetime-local" v-model="logDateTo"
              class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
          </div>
          <div class="flex items-end gap-2">
            <button @click="applyLogFilters"
              class="text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white px-4 py-2 rounded-xl transition-all active:scale-[0.97] cursor-pointer">
              筛选
            </button>
            <button @click="resetLogFilters"
              class="text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/60 px-4 py-2 rounded-xl transition-all cursor-pointer">
              重置
            </button>
            <button @click="exportLogs" :disabled="isExportingLogs"
              class="text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/60 px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50">
              <span :class="isExportingLogs ? 'i-lucide-loader animate-spin' : 'i-lucide-download'" class="text-xs" />
              {{ isExportingLogs ? '导出中...' : '导出' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 限流统计面板 -->
      <div v-if="overviewRateTop.topIps.length || overviewRateTop.topKeys.length" class="bg-white/[0.04] rounded-2xl p-5 space-y-3 shadow-lg shadow-black/20 border-l-2 border-[#ff9f0a]/30">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-white">⚡ 今日限流统计</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20">全局数据</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div class="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1.5">Top IP（被限流次数）</div>
            <div class="space-y-1">
              <div v-for="item in overviewRateTop.topIps" :key="item.ip"
                class="flex justify-between items-center text-xs bg-white/[0.02] rounded-lg px-3 py-1.5">
                <span class="font-mono text-white/70">{{ item.ip }}</span>
                <span class="font-mono text-[#ff9f0a]">{{ item.count }} 次</span>
              </div>
              <div v-if="overviewRateTop.topIps.length === 0" class="text-xs text-white/20 py-1">-</div>
            </div>
          </div>
          <div>
            <div class="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1.5">Top API Key（被限流次数）</div>
            <div class="space-y-1">
              <div v-for="item in overviewRateTop.topKeys" :key="item.keyPrefix"
                class="flex justify-between items-center text-xs bg-white/[0.02] rounded-lg px-3 py-1.5">
                <span class="font-mono text-white/70">{{ item.keyPrefix }}...</span>
                <span class="font-mono text-[#ff9f0a]">{{ item.count }} 次</span>
              </div>
              <div v-if="overviewRateTop.topKeys.length === 0" class="text-xs text-white/20 py-1">-</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 日志表格 -->
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
                  <span :class="['text-[10px] px-2 py-0.5 rounded-full border font-mono', severityStyle(log.action)]">{{ codeLabel(log.action) }}</span>
                </td>
                <td class="px-5 py-5 text-white/50 font-mono text-xs">{{ log.ip || '-' }}</td>
                <td class="px-5 py-5 text-white/50 font-mono text-xs">{{ log.metadata?.path || '-' }}</td>
                <td class="px-5 py-5 text-white/30 text-xs max-w-[220px]">
                  <div v-if="log.metadata?.keyPrefix" class="truncate" :title="log.metadata.keyPrefix">Key: {{ log.metadata.keyPrefix }}</div>
                  <div v-if="log.metadata?.country" class="truncate">国家: {{ log.metadata.country }}</div>
                  <div v-if="log.metadata?.reason" class="truncate">{{ log.metadata.reason }}</div>
                  <div v-if="!log.metadata?.keyPrefix && !log.metadata?.country && !log.metadata?.reason" class="opacity-50">-</div>
                </td>
              </tr>
              <tr v-if="!logs.length">
                <td colspan="5" class="py-10 text-center text-sm text-white/25">暂无安全事件记录</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页控制栏 -->
        <div v-if="logsTotal > 0" class="flex items-center justify-between px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
          <div class="text-[11px] text-white/30 font-mono">共 {{ logsTotal }} 条 · 第 {{ logsPage }}/{{ logTotalPages }} 页</div>
          <div class="flex items-center gap-2">
            <button @click="handleLogsPageChange(logsPage - 1)" :disabled="logsPage <= 1"
              class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">上一页</button>
            <button @click="handleLogsPageChange(logsPage + 1)" :disabled="logsPage >= logTotalPages"
              class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ 2FA ═══ -->
    <div v-if="subTab === 'twofa'" class="space-y-6">
      <div class="bg-white/[0.04] rounded-2xl p-6 space-y-6 shadow-lg shadow-black/20">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-sm font-semibold text-white">双因素认证 (TOTP)</h2>
            <p class="text-xs text-white/40 mt-1">使用 Google Authenticator 或 Authy 等 TOTP 应用生成一次性验证码，提升账户安全性。</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5"
              :class="twoFAStatus?.enabled
                ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
                : 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20'">
              <span class="w-1.5 h-1.5 rounded-full" :class="twoFAStatus?.enabled ? 'bg-[#30d158]' : 'bg-[#ff9f0a]'"></span>
              {{ twoFAStatus?.enabled ? '已启用' : '未启用' }}
            </span>
          </div>
        </div>

        <!-- 已启用状态 -->
        <div v-if="twoFAStatus?.enabled" class="space-y-4">
          <div class="bg-[#30d158]/[0.04] rounded-xl p-4 border border-[#30d158]/10">
            <div class="flex items-center gap-2 text-[#30d158] text-xs font-semibold mb-1">
              <span class="i-lucide-shield-check text-sm" /> 2FA 已激活
            </div>
            <p class="text-xs text-white/40">
              {{ twoFAStatus.verifiedAt ? `启用时间: ${new Date(twoFAStatus.verifiedAt).toLocaleString()}` : '' }}
            </p>
          </div>
          <div>
            <button @click="twoFAShowDisable = !twoFAShowDisable"
              class="text-xs font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-5 py-2.5 rounded-xl border border-[#ff453a]/20 transition-all active:scale-[0.97] cursor-pointer">
              关闭 2FA
            </button>

            <!-- 关闭确认 -->
            <div v-if="twoFAShowDisable" class="mt-4 bg-[#ff453a]/[0.04] rounded-xl p-4 border border-[#ff453a]/10 space-y-3">
              <p class="text-xs text-white/60">请输入当前 TOTP 验证码或备用恢复码来关闭 2FA：</p>
              <div class="flex items-center gap-3">
                <input v-model="twoFADisableCode" type="text" maxlength="6" placeholder="验证码或恢复码"
                  class="flex-1 bg-white/[0.03] border border-white/[0.08] focus:border-[#ff453a]/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none placeholder:text-white/20" />
                <button @click="handleTwoFADisable" :disabled="twoFASaving"
                  class="text-xs font-semibold bg-[#ff453a]/20 hover:bg-[#ff453a]/30 text-[#ff453a] px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50">
                  {{ twoFASaving ? '处理中...' : '确认关闭' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 未启用状态 -->
        <div v-else>
          <button @click="handleTwoFASetup" :disabled="twoFASaving"
            class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white px-6 py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.15)] disabled:opacity-50">
            {{ twoFASaving ? '生成中...' : '设置 2FA' }}
          </button>

          <!-- 设置流程 -->
          <div v-if="twoFASetupData && twoFAShowSetup" class="mt-6 space-y-6">
            <div class="bg-indigo-500/[0.04] rounded-xl p-5 border border-indigo-500/10 space-y-4">
              <h3 class="text-xs font-semibold text-white">第一步：扫描二维码</h3>
              <p class="text-xs text-white/40">使用 TOTP 应用扫描以下二维码：</p>
              <div class="flex justify-center">
                <img :src="twoFASetupData.qrCode" alt="2FA QR Code" class="w-48 h-48 rounded-xl bg-white p-2" />
              </div>
              <div>
                <p class="text-xs text-white/40 mb-1">或手动输入密钥：</p>
                <code class="block bg-white/[0.03] rounded-lg px-3 py-2 text-xs font-mono text-[#30d158] select-all break-all">{{ twoFASetupData.secret }}</code>
              </div>
            </div>

            <div class="bg-[#ff9f0a]/[0.04] rounded-xl p-5 border border-[#ff9f0a]/10 space-y-3">
              <h3 class="text-xs font-semibold text-[#ff9f0a]">第二步：保存备用恢复码</h3>
              <p class="text-xs text-white/40">请务必安全保存以下 8 个恢复码。每个恢复码只能使用一次，用于在丢失 TOTP 设备时登录。</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div v-for="code in twoFASetupData.backupCodes" :key="code"
                  class="bg-white/[0.03] rounded-lg px-3 py-2 text-xs font-mono text-white/70 text-center select-all border border-white/[0.06]">
                  {{ code }}
                </div>
              </div>
              <button @click="copyText(twoFASetupData!.backupCodes.join('\n'))"
                class="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer bg-transparent border-0">
                <span class="i-lucide-copy text-xs mr-1" />复制全部恢复码
              </button>
            </div>

            <div class="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06] space-y-3">
              <h3 class="text-xs font-semibold text-white">第三步：验证并启用</h3>
              <p class="text-xs text-white/40">在 TOTP 应用中输入当前显示的 6 位验证码：</p>
              <div class="flex items-center gap-3">
                <input v-model="twoFASetupCode" type="text" maxlength="6" placeholder="000000"
                  class="w-40 bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono text-center text-2xl tracking-[0.5em] focus:outline-none placeholder:text-white/10" />
                <button @click="handleTwoFAVerify" :disabled="twoFASaving || twoFASetupCode.length !== 6"
                  class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white px-6 py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50">
                  {{ twoFASaving ? '验证中...' : '验证并启用' }}
                </button>
              </div>
            </div>

            <div class="bg-[#ff453a]/[0.04] rounded-xl p-4 border border-[#ff453a]/10">
              <p class="text-xs text-white/60">⚠️ 在验证成功之前，2FA 不会生效。如果关闭此窗口，未验证的密钥将被覆盖。</p>
            </div>
          </div>
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
