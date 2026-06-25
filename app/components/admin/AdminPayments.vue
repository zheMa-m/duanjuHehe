<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits<{ toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

// ── Types ──────────────────────────────────────────────
interface PaymentConfig {
  provider: string
  isEnabled: boolean
  publicKeys: Record<string, any>
  extraMeta: Record<string, any>
  secrets: Record<string, string>
  updatedAt?: string
}

// ── State ──────────────────────────────────────────────
const paymentConfigs = ref<PaymentConfig[]>([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingPayment = ref<PaymentConfig | null>(null)
const testingConnection = ref('')
const activeTab = ref<'general' | 'public' | 'secrets'>('general')

// ── Channel metadata ───────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const channelMeta: any = {
  stripe:     { label: 'Stripe',     desc: '国际信用卡/借记卡，一次性付款与订阅计费', icon: 'i-lucide-credit-card',  color: '#635bff', keyLabel: 'Publishable Key' },
  paypal:     { label: 'PayPal',     desc: '全球数字钱包，余额/卡支付 + Webhook',     icon: 'i-lucide-wallet',       color: '#003087', keyLabel: 'Client ID' },
  google_pay: { label: 'Google Pay', desc: 'Android/iOS/Web 一键支付，全平台覆盖',    icon: 'i-lucide-smartphone',   color: '#4285f4', keyLabel: 'Merchant ID' },
  apple_iap:  { label: 'Apple IAP',  desc: 'App Store 内购订阅，含收据验证',          icon: 'i-lucide-apple',        color: '#a2aaad', keyLabel: 'Bundle ID' },
  alipay:     { label: 'Alipay',     desc: '支付宝扫码/APP/H5 支付，国内主流',        icon: 'i-lucide-scan-line',    color: '#1677ff', keyLabel: 'App ID' },
  wechat:     { label: 'WeChat Pay', desc: '微信支付 JSAPI/Native/小程序',            icon: 'i-lucide-message-circle', color: '#07c160', keyLabel: 'App ID' },
}

// manual 不显示在 UI 中
const visibleConfigs = computed(() =>
  paymentConfigs.value.filter(c => c.provider !== 'manual')
)

// ── 可新增渠道（channelMeta 中有定义但尚未配置） ──────────
const availableNewProviders = computed(() => {
  const existing = new Set(paymentConfigs.value.map(c => c.provider))
  return Object.keys(channelMeta).filter(p => !existing.has(p))
})
const showAddPanel = ref(false)
const addPanelRef = ref<HTMLElement | null>(null)

// 点击外部关闭添加渠道下拉
function handleClickOutsideAdd(e: MouseEvent) {
  if (showAddPanel.value && addPanelRef.value && !addPanelRef.value.contains(e.target as Node)) {
    showAddPanel.value = false
  }
}
onMounted(() => { if (import.meta.client) document.addEventListener('click', handleClickOutsideAdd, true) })
onBeforeUnmount(() => { if (import.meta.client) document.removeEventListener('click', handleClickOutsideAdd, true) })

function openCreate(provider: string) {
  const cfg: PaymentConfig = {
    provider,
    isEnabled: false,
    publicKeys: { ...(defaultPublicKeys[provider] || {}) },
    extraMeta: { environment: defaultEnvs[provider] || 'sandbox' },
    secrets: { ...(defaultSecrets[provider] || {}) },
  }
  editingPayment.value = cfg
  activeTab.value = 'general'
  showAddPanel.value = false
  showModal.value = true
}

// ── KPI ────────────────────────────────────────────────
const totalChannels = computed(() => visibleConfigs.value.length)
const enabledCount = computed(() => visibleConfigs.value.filter(c => c.isEnabled).length)
const configuredCount = computed(() => visibleConfigs.value.filter(c => hasSecretsConfigured(c)).length)

// ── Env labels ─────────────────────────────────────────
const envLabels: Record<string, string> = { sandbox: '沙箱', TEST: '测试', live: '生产', PRODUCTION: '生产' }

// ── Secrets field definitions per provider ─────────────
const secretFields: Record<string, { key: string; label: string; placeholder: string; isPassword: boolean }[]> = {
  stripe: [
    { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_xxx...', isPassword: true },
    { key: 'webhookSecret', label: 'Webhook Signing Secret', placeholder: 'whsec_xxx...', isPassword: true },
  ],
  paypal: [
    { key: 'clientSecret', label: 'Client Secret', placeholder: 'EL...', isPassword: true },
    { key: 'webhookId', label: 'Webhook ID', placeholder: '2M...', isPassword: false },
  ],
  google_pay: [
    { key: 'gatewayMerchantId', label: 'Gateway Merchant ID', placeholder: 'merchant-id', isPassword: false },
  ],
  apple_iap: [
    { key: 'sharedSecret', label: 'Shared Secret', placeholder: 'App Store Connect 共享密钥', isPassword: true },
  ],
  alipay: [
    { key: 'privateKey', label: '应用私钥', placeholder: 'RSA2 私钥...', isPassword: true },
    { key: 'alipayPublicKey', label: '支付宝公钥', placeholder: '支付宝返回的公钥', isPassword: false },
  ],
  wechat: [
    { key: 'mchKey', label: 'API v3 密钥', placeholder: '32 位密钥...', isPassword: true },
    { key: 'serialNo', label: '证书序列号', placeholder: '证书序列号', isPassword: false },
  ],
}

const publicFields: Record<string, { key: string; label: string; placeholder: string }[]> = {
  stripe:     [{ key: 'publicKey', label: 'Publishable Key', placeholder: 'pk_live_xxx...' }],
  paypal:     [{ key: 'clientId', label: 'Client ID', placeholder: 'AX...' }],
  google_pay: [{ key: 'merchantId', label: 'Merchant ID', placeholder: 'BCR2...' }],
  apple_iap:  [{ key: 'bundleId', label: 'Bundle ID', placeholder: 'com.example.app' }],
  alipay:     [{ key: 'appId', label: 'App ID', placeholder: '2021...' }],
  wechat:     [{ key: 'appId', label: 'App ID', placeholder: 'wx...' }],
}

// ── Default secrets/publicKeys for editing ─────────────
const defaultSecrets: Record<string, Record<string, string>> = {
  stripe: { secretKey: '', webhookSecret: '' },
  paypal: { clientSecret: '', webhookId: '' },
  google_pay: { gatewayMerchantId: '' },
  apple_iap: { sharedSecret: '' },
  alipay: { privateKey: '', alipayPublicKey: '' },
  wechat: { mchKey: '', serialNo: '' },
}

const defaultPublicKeys: Record<string, Record<string, string>> = {
  stripe: { publicKey: '' }, paypal: { clientId: '' }, google_pay: { merchantId: '' },
  apple_iap: { bundleId: '' }, alipay: { appId: '' }, wechat: { appId: '' },
}

const defaultEnvs: Record<string, string> = {
  stripe: 'live', paypal: 'sandbox', google_pay: 'TEST', apple_iap: 'sandbox', alipay: '生产', wechat: '生产',
}

// ── Data ───────────────────────────────────────────────
async function fetchConfigs() {
  loading.value = true
  try {
    const res = await $fetch<{ data: PaymentConfig[] }>('/api/admin/config/payment')
    paymentConfigs.value = res.data
  } catch (e: any) {
    emit('toast', '支付配置获取失败: ' + (e.message || '未知错误'), 'error')
  } finally {
    loading.value = false
  }
}

// ── Edit ───────────────────────────────────────────────
function openEdit(cfg: PaymentConfig) {
  editingPayment.value = JSON.parse(JSON.stringify(cfg))
  const p = cfg.provider
  if (!editingPayment.value!.secrets) editingPayment.value!.secrets = { ...(defaultSecrets[p] || {}) }
  if (!editingPayment.value!.publicKeys) editingPayment.value!.publicKeys = { ...(defaultPublicKeys[p] || {}) }
  if (!editingPayment.value!.extraMeta) editingPayment.value!.extraMeta = {}
  if (!editingPayment.value!.extraMeta.environment) editingPayment.value!.extraMeta.environment = defaultEnvs[p] || ''
  activeTab.value = 'general'
  showModal.value = true
}

async function saveConfig() {
  if (!editingPayment.value) return
  saving.value = true
  try {
    await $fetch('/api/admin/config/payment', {
      method: 'PATCH',
      body: {
        provider: editingPayment.value.provider,
        isEnabled: editingPayment.value.isEnabled,
        publicKeys: editingPayment.value.publicKeys,
        extraMeta: editingPayment.value.extraMeta,
        secrets: editingPayment.value.secrets,
      },
    })
    emit('toast', `${channelMeta[editingPayment.value.provider]?.label || editingPayment.value.provider} 配置已更新`, 'success')
    showModal.value = false
    await fetchConfigs()
  } catch (e: any) {
    emit('toast', '保存失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    saving.value = false
  }
}

// ── Test ───────────────────────────────────────────────
async function testConnection(provider: string) {
  testingConnection.value = provider
  try {
    const res = await $fetch<{ data: { results: { status: string; message: string }[] } }>(
      '/api/admin/config/payment/test-connection',
      { method: 'POST', body: { provider } }
    )
    const r = res.data.results[0]
    if (!r) return
    emit('toast', `${channelMeta[provider]?.label || provider}: ${r.status === 'ok' ? '连接成功' : '连接失败'} — ${r.message}`, r.status === 'ok' ? 'success' : 'error')
  } catch (e: any) {
    emit('toast', '连接测试失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    testingConnection.value = ''
  }
}

// ── Helpers ────────────────────────────────────────────
function getPublicKeyDisplay(cfg: PaymentConfig): string {
  const pk = cfg.publicKeys
  if (!pk) return ''
  return pk.publicKey || pk.publishableKey || pk.clientId || pk.merchantId || pk.bundleId || pk.appId || ''
}

function hasSecretsConfigured(cfg: PaymentConfig): boolean {
  return Object.values(cfg.secrets || {}).some(v => v && v.length > 0 && !v.includes('****'))
}

function getChannelHealth(cfg: PaymentConfig): 'healthy' | 'partial' | 'unconfigured' {
  const hasKey = !!getPublicKeyDisplay(cfg)
  const hasSecret = hasSecretsConfigured(cfg)
  if (hasKey && hasSecret) return 'healthy'
  if (hasKey || hasSecret) return 'partial'
  return 'unconfigured'
}

const healthColor = { healthy: '#30d158', partial: '#ffd60a', unconfigured: '#636366' }
const healthLabel = { healthy: '已就绪', partial: '待完善', unconfigured: '未配置' }

onMounted(() => fetchConfigs())
</script>

<template>
  <div class="space-y-6 animate-fade-in text-white">
    <!-- ═══ 顶栏 ═══ -->
    <div class="flex justify-between items-start flex-wrap gap-4">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">支付</h1>
        <p class="text-white/40 text-sm mt-1">支付渠道管理 — 密钥配置、启停控制与连通性测试</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative" ref="addPanelRef">
          <button @click="showAddPanel = !showAddPanel" :disabled="availableNewProviders.length === 0"
            class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 border border-indigo-500/30">
            <span class="i-lucide-plus text-xs" />
            添加渠道
          </button>
          <!-- 渠道选择下拉 -->
          <Transition name="modal">
            <div v-if="showAddPanel" class="absolute right-0 top-full mt-2 w-64 bg-[#0e0e12] border border-white/[0.10] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div class="px-4 py-3 border-b border-white/[0.06]">
                <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30">选择支付渠道</span>
              </div>
              <div class="py-1">
                <button v-for="p in availableNewProviders" :key="p" @click="openCreate(p)"
                  class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.06] transition-colors cursor-pointer text-left">
                  <span class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    :style="{ background: (channelMeta[p]?.color || '#6366f1') + '18' }">
                    <span v-if="p === 'stripe'" class="i-lucide-credit-card text-sm" :style="{ color: channelMeta.stripe?.color }" />
                    <span v-else-if="p === 'paypal'" class="i-lucide-wallet text-sm" :style="{ color: channelMeta.paypal?.color }" />
                    <span v-else-if="p === 'google_pay'" class="i-lucide-smartphone text-sm" :style="{ color: channelMeta.google_pay?.color }" />
                    <span v-else-if="p === 'apple_iap'" class="i-lucide-apple text-sm" :style="{ color: channelMeta.apple_iap?.color }" />
                    <span v-else-if="p === 'alipay'" class="i-lucide-scan-line text-sm" :style="{ color: channelMeta.alipay?.color }" />
                    <span v-else-if="p === 'wechat'" class="i-lucide-message-circle text-sm" :style="{ color: channelMeta.wechat?.color }" />
                  </span>
                  <div class="min-w-0">
                    <div class="text-xs font-medium text-white/80">{{ channelMeta[p]?.label }}</div>
                    <div class="text-[9px] text-white/30 truncate">{{ channelMeta[p]?.desc }}</div>
                  </div>
                </button>
              </div>
              <div v-if="availableNewProviders.length === 0" class="px-4 py-6 text-center text-white/20 text-xs">
                所有渠道均已配置
              </div>
            </div>
          </Transition>
        </div>
        <button @click="fetchConfigs" :disabled="loading"
          class="text-xs bg-white/[0.06] hover:bg-white/[0.10] text-white/80 font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 border border-white/[0.06]">
          <span :class="{ 'animate-spin': loading }"><span class="i-lucide-refresh-cw text-xs" /></span>
          {{ loading ? '同步中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- ═══ KPI ═══ -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div class="flex items-center gap-2 mb-2">
          <span class="i-lucide-layers text-[13px] text-blue-400/60" />
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">渠道总量</span>
        </div>
        <span class="text-[36px] font-bold tracking-tight text-white font-mono leading-none">{{ totalChannels }}</span>
      </div>
      <div class="p-5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div class="flex items-center gap-2 mb-2">
          <span class="i-lucide-check-circle text-[13px] text-emerald-400/60" />
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">已启用</span>
        </div>
        <span class="text-[36px] font-bold tracking-tight text-[#30d158] font-mono leading-none">{{ enabledCount }}</span>
      </div>
      <div class="p-5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div class="flex items-center gap-2 mb-2">
          <span class="i-lucide-key-round text-[13px] text-amber-400/60" />
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">密钥就绪</span>
        </div>
        <span class="text-[36px] font-bold tracking-tight text-amber-400 font-mono leading-none">{{ configuredCount }}</span>
      </div>
    </div>

    <!-- ═══ 渠道列表 ═══ -->
    <div class="bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden">
      <!-- 表头 -->
      <div class="grid grid-cols-[1fr_100px_100px_100px_120px] gap-4 px-5 py-3 border-b border-white/[0.05] text-white/30 text-[9px] font-semibold uppercase tracking-[0.15em] bg-white/[0.005]">
        <span>支付渠道</span>
        <span class="text-center">状态</span>
        <span class="text-center">健康度</span>
        <span class="text-center">环境</span>
        <span class="text-right">操作</span>
      </div>

      <!-- 行 -->
      <div v-for="cfg in visibleConfigs" :key="cfg.provider"
        class="grid grid-cols-[1fr_100px_100px_100px_120px] gap-4 px-5 py-4 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors items-center">
        <!-- 渠道信息 -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            :style="{ background: (channelMeta[cfg.provider]?.color || '#6366f1') + '18' }">
            <span v-if="cfg.provider === 'stripe'" class="i-lucide-credit-card text-base" :style="{ color: channelMeta.stripe?.color }" />
            <span v-else-if="cfg.provider === 'paypal'" class="i-lucide-wallet text-base" :style="{ color: channelMeta.paypal?.color }" />
            <span v-else-if="cfg.provider === 'google_pay'" class="i-lucide-smartphone text-base" :style="{ color: channelMeta.google_pay?.color }" />
            <span v-else-if="cfg.provider === 'apple_iap'" class="i-lucide-apple text-base" :style="{ color: channelMeta.apple_iap?.color }" />
            <span v-else-if="cfg.provider === 'alipay'" class="i-lucide-scan-line text-base" :style="{ color: channelMeta.alipay?.color }" />
            <span v-else-if="cfg.provider === 'wechat'" class="i-lucide-message-circle text-base" :style="{ color: channelMeta.wechat?.color }" />
            <span v-else class="i-lucide-credit-card text-base text-white/50" />
          </div>
          <div class="min-w-0">
            <div class="text-white/90 font-medium text-sm">{{ channelMeta[cfg.provider]?.label || cfg.provider }}</div>
            <div class="text-white/25 text-[10px] truncate max-w-[280px] mt-0.5">{{ channelMeta[cfg.provider]?.desc || '支付渠道' }}</div>
          </div>
        </div>

        <!-- 启停状态 -->
        <div class="text-center">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
            :class="cfg.isEnabled
              ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
              : 'bg-white/5 text-white/40 border-white/10'">
            <span class="w-1.5 h-1.5 rounded-full" :class="cfg.isEnabled ? 'bg-[#30d158]' : 'bg-white/30'" />
            {{ cfg.isEnabled ? '已启用' : '已禁用' }}
          </span>
        </div>

        <!-- 健康度 -->
        <div class="text-center">
          <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold"
            :style="{ color: healthColor[getChannelHealth(cfg)] }">
            <span class="w-1.5 h-1.5 rounded-full" :style="{ background: healthColor[getChannelHealth(cfg)] }" />
            {{ healthLabel[getChannelHealth(cfg)] }}
          </span>
        </div>

        <!-- 环境 -->
        <div class="text-center">
          <span class="text-[10px] font-mono text-white/35">
            {{ cfg.extraMeta?.environment ? (envLabels[cfg.extraMeta.environment] || cfg.extraMeta.environment) : '—' }}
          </span>
        </div>

        <!-- 操作 -->
        <div class="flex items-center justify-end gap-2">
          <button @click="testConnection(cfg.provider)"
            :disabled="testingConnection === cfg.provider || !cfg.isEnabled"
            class="text-[10px] px-2.5 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] text-white/50 hover:text-white/80 disabled:opacity-30 transition-all cursor-pointer font-semibold">
            <span v-if="testingConnection === cfg.provider" class="i-lucide-loader-circle animate-spin text-[10px] mr-1" />
            <span v-else class="i-lucide-zap text-[10px] mr-1" />
            {{ testingConnection === cfg.provider ? '测试中' : '测试' }}
          </button>
          <button @click="openEdit(cfg)"
            class="text-[10px] px-2.5 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-semibold transition-all cursor-pointer">
            <span class="i-lucide-settings text-[10px] mr-1" />
            配置
          </button>
        </div>
      </div>

      <!-- 空态 -->
      <div v-if="!visibleConfigs.length && !loading" class="py-16 text-center text-white/20 text-xs">
        暂无支付渠道配置
      </div>
    </div>

    <!-- 密钥摘要面板 -->
    <div class="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
      <h3 class="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25 mb-4">密钥配置摘要</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div v-for="cfg in visibleConfigs" :key="cfg.provider"
          class="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span v-if="cfg.provider === 'stripe'" class="i-lucide-credit-card text-sm" :style="{ color: channelMeta.stripe?.color }" />
            <span v-else-if="cfg.provider === 'paypal'" class="i-lucide-wallet text-sm" :style="{ color: channelMeta.paypal?.color }" />
            <span v-else-if="cfg.provider === 'google_pay'" class="i-lucide-smartphone text-sm" :style="{ color: channelMeta.google_pay?.color }" />
            <span v-else-if="cfg.provider === 'apple_iap'" class="i-lucide-apple text-sm" :style="{ color: channelMeta.apple_iap?.color }" />
            <span v-else-if="cfg.provider === 'alipay'" class="i-lucide-scan-line text-sm" :style="{ color: channelMeta.alipay?.color }" />
            <span v-else-if="cfg.provider === 'wechat'" class="i-lucide-message-circle text-sm" :style="{ color: channelMeta.wechat?.color }" />
            <span v-else class="i-lucide-credit-card text-sm text-white/50" />
          <div class="min-w-0 flex-1">
            <div class="text-[11px] font-medium text-white/70">{{ channelMeta[cfg.provider]?.label || cfg.provider }}</div>
            <div class="text-[9px] font-mono text-white/25 truncate">
              {{ getPublicKeyDisplay(cfg) ? `${channelMeta[cfg.provider]?.keyLabel}: ${getPublicKeyDisplay(cfg).slice(0, 12)}...` : '公钥未配置' }}
            </div>
          </div>
          <span class="w-2 h-2 rounded-full flex-shrink-0"
            :style="{ background: hasSecretsConfigured(cfg) ? '#30d158' : '#636366' }" />
        </div>
      </div>
    </div>

    <!-- ═══ 配置弹窗（Tab 式） ═══ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal && editingPayment" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="showModal = false">
          <div class="bg-[#0e0e12] border border-white/[0.08] rounded-xl w-full max-w-xl max-h-[85vh] overflow-hidden shadow-2xl text-white" @click.stop>
            <!-- 弹窗头部 -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                  :style="{ background: (channelMeta[editingPayment.provider]?.color || '#6366f1') + '20' }">
                  <span v-if="editingPayment.provider === 'stripe'" class="i-lucide-credit-card text-sm" :style="{ color: channelMeta.stripe?.color }" />
                  <span v-else-if="editingPayment.provider === 'paypal'" class="i-lucide-wallet text-sm" :style="{ color: channelMeta.paypal?.color }" />
                  <span v-else-if="editingPayment.provider === 'google_pay'" class="i-lucide-smartphone text-sm" :style="{ color: channelMeta.google_pay?.color }" />
                  <span v-else-if="editingPayment.provider === 'apple_iap'" class="i-lucide-apple text-sm" :style="{ color: channelMeta.apple_iap?.color }" />
                  <span v-else-if="editingPayment.provider === 'alipay'" class="i-lucide-scan-line text-sm" :style="{ color: channelMeta.alipay?.color }" />
                  <span v-else-if="editingPayment.provider === 'wechat'" class="i-lucide-message-circle text-sm" :style="{ color: channelMeta.wechat?.color }" />
                  <span v-else class="i-lucide-credit-card text-sm text-white/50" />
                </div>
                <div>
                  <h2 class="text-base font-bold">{{ channelMeta[editingPayment.provider]?.label || editingPayment.provider }}</h2>
                  <p class="text-[10px] text-white/30">{{ channelMeta[editingPayment.provider]?.desc }}</p>
                </div>
              </div>
              <button @click="showModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors cursor-pointer text-xl leading-none font-light">&times;</button>
            </div>

            <!-- Tab 导航 -->
            <div class="flex border-b border-white/[0.06] px-6">
              <button @click="activeTab = 'general'"
                class="text-[11px] font-semibold px-4 py-3 border-b-2 transition-all cursor-pointer bg-transparent"
                :class="activeTab === 'general'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-white/35 hover:text-white/60'"
              >基本设置</button>
              <button @click="activeTab = 'public'"
                class="text-[11px] font-semibold px-4 py-3 border-b-2 transition-all cursor-pointer bg-transparent"
                :class="activeTab === 'public'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-white/35 hover:text-white/60'"
              >公开密钥</button>
              <button @click="activeTab = 'secrets'"
                class="text-[11px] font-semibold px-4 py-3 border-b-2 transition-all cursor-pointer bg-transparent"
                :class="activeTab === 'secrets'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-white/35 hover:text-white/60'"
              >私密密钥</button>
            </div>

            <!-- Tab 内容 -->
            <div class="px-6 py-5 overflow-y-auto max-h-[55vh] space-y-5">

              <!-- ── 基本设置 ── -->
              <template v-if="activeTab === 'general'">
                <div class="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <div class="text-sm font-medium">启用此支付渠道</div>
                    <div class="text-[10px] text-white/30 mt-0.5">关闭后前端收银台将隐藏此支付方式</div>
                  </div>
                  <button @click="editingPayment.isEnabled = !editingPayment.isEnabled"
                    class="w-11 h-6 rounded-full transition-all cursor-pointer relative"
                    :class="editingPayment.isEnabled ? 'bg-indigo-600' : 'bg-white/10'">
                    <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      :class="editingPayment.isEnabled ? 'left-[22px]' : 'left-0.5'" />
                  </button>
                </div>

                <div class="space-y-1.5">
                  <label class="text-[10px] font-semibold text-white/35 uppercase tracking-wide">运行环境</label>
                  <select v-model="editingPayment.extraMeta.environment"
                    class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                    <option value="sandbox">沙箱 (Sandbox)</option>
                    <option value="TEST">测试 (Test)</option>
                    <option value="live">生产 (Live)</option>
                    <option value="PRODUCTION">生产 (Production)</option>
                  </select>
                </div>
              </template>

              <!-- ── 公开密钥 ── -->
              <template v-if="activeTab === 'public'">
                <p class="text-[10px] text-white/30 -mt-1">公开密钥用于前端 SDK 初始化，可安全暴露给客户端。</p>
                <div v-for="field in (publicFields[editingPayment.provider] || [])" :key="field.key" class="space-y-1.5">
                  <label class="text-[10px] font-semibold text-white/35 uppercase tracking-wide">{{ field.label }}</label>
                  <input v-model="editingPayment.publicKeys[field.key]" type="text"
                    :placeholder="field.placeholder"
                    class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50 transition-colors" />
                </div>
                <div v-if="!(publicFields[editingPayment.provider]?.length)" class="py-6 text-center text-white/20 text-xs">
                  此渠道无需公开密钥
                </div>
              </template>

              <!-- ── 私密密钥 ── -->
              <template v-if="activeTab === 'secrets'">
                <div class="p-3 rounded-lg bg-rose-500/[0.06] border border-rose-500/10">
                  <p class="text-[10px] text-rose-400/80 flex items-center gap-1.5">
                    <span class="i-lucide-shield-alert text-xs" />
                    密钥仅存储在服务端，绝不暴露到前端。留空或含 * 的值不会被覆盖。
                  </p>
                </div>
                <div v-for="field in (secretFields[editingPayment.provider] || [])" :key="field.key" class="space-y-1.5">
                  <label class="text-[10px] font-semibold text-white/35 uppercase tracking-wide">{{ field.label }}</label>
                  <input v-model="editingPayment.secrets[field.key]" :type="field.isPassword ? 'password' : 'text'"
                    :placeholder="field.placeholder"
                    class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50 transition-colors" />
                </div>
                <div v-if="!(secretFields[editingPayment.provider]?.length)" class="py-6 text-center text-white/20 text-xs">
                  此渠道无需私密密钥
                </div>
              </template>
            </div>

            <!-- 弹窗底部 -->
            <div class="flex justify-between items-center px-6 py-4 border-t border-white/[0.06]">
              <button @click="testConnection(editingPayment.provider)"
                :disabled="testingConnection === editingPayment.provider"
                class="text-xs px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/70 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 font-semibold whitespace-nowrap">
                <span v-if="testingConnection === editingPayment.provider" class="i-lucide-loader-circle animate-spin text-xs" />
                <span v-else class="i-lucide-zap text-xs" />
                <span class="whitespace-nowrap">{{ testingConnection === editingPayment.provider ? '测试中...' : '测试连接' }}</span>
              </button>
              <div class="flex gap-3">
                <button @click="showModal = false" class="text-xs px-5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/60 transition-colors cursor-pointer font-semibold">取消</button>
                <button @click="saveConfig" :disabled="saving"
                  class="text-xs px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-all active:scale-[0.98] cursor-pointer">
                  {{ saving ? '保存中...' : '保存配置' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.97); }

@media (max-width: 768px) {
  .grid-cols-\[1fr_100px_100px_100px_120px\] {
    grid-template-columns: 1fr 80px 80px !important;
  }
  .grid-cols-\[1fr_100px_100px_100px_120px\] > :nth-child(4),
  .grid-cols-\[1fr_100px_100px_100px_120px\] > :nth-child(5) {
    display: none;
  }
}
</style>
