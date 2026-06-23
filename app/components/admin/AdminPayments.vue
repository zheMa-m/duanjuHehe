<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{ toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

// ── 支付通道配置数据 ──
interface PaymentConfig {
  provider: string
  isEnabled: boolean
  publicKeys: Record<string, any>
  extraMeta: Record<string, any>
  secrets: Record<string, string>
  updatedAt?: string
}
const paymentConfigs = ref<PaymentConfig[]>([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingPayment = ref<PaymentConfig | null>(null)
const testingConnection = ref('')

const providerDescriptions: Record<string, string> = {
  stripe: '国际信用卡/借记卡支付网关，支持一次性付款与订阅计费、周期账单。',
  paypal: '全球领先的数字钱包支付，支持 PayPal 余额/卡支付，含 Webhook 通知。',
  google_pay: 'Google Pay 一键支付，Android/iOS/Web 全平台覆盖，需搭配网关使用。',
  apple_iap: 'Apple App Store 内购支付（iOS 应用内订阅），含收据验证与通知。',
  manual: '管理员手动入账，用于线下收款/人工对账/补偿发放场景。',
}

const providerKeyLabel: Record<string, string> = {
  stripe: 'Publishable Key',
  paypal: 'Client ID',
  google_pay: 'Merchant ID',
  apple_iap: 'Bundle ID',
  manual: '—',
}

// ── 数据加载 ──
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

// ── 编辑弹窗 ──
function openEdit(cfg: PaymentConfig) {
  editingPayment.value = JSON.parse(JSON.stringify(cfg))
  if (!editingPayment.value!.secrets) {
    const defs: Record<string, any> = {
      stripe: { secretKey: '', webhookSecret: '' },
      paypal: { clientSecret: '', webhookId: '' },
      google_pay: { gatewayMerchantId: '' },
      apple_iap: { sharedSecret: '' },
      manual: {},
    }
    editingPayment.value!.secrets = defs[cfg.provider] || {}
  }
  if (!editingPayment.value!.publicKeys) {
    const pks: Record<string, any> = {
      stripe: { publicKey: '' },
      paypal: { clientId: '' },
      google_pay: { merchantId: '' },
      apple_iap: { bundleId: '' },
      manual: {},
    }
    editingPayment.value!.publicKeys = pks[cfg.provider] || {}
  }
  if (!editingPayment.value!.extraMeta) editingPayment.value!.extraMeta = {}
  if (!editingPayment.value!.extraMeta.environment) {
    const envs: Record<string, string> = {
      stripe: 'live', paypal: 'sandbox', google_pay: 'TEST', apple_iap: 'sandbox', manual: '',
    }
    editingPayment.value!.extraMeta.environment = envs[cfg.provider] || ''
  }
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
    emit('toast', `[${editingPayment.value.provider}] 配置已更新`, 'success')
    showModal.value = false
    await fetchConfigs()
  } catch (e: any) {
    emit('toast', '保存失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    saving.value = false
  }
}

async function testConnection(provider: string) {
  testingConnection.value = provider
  try {
    const res = await $fetch<{ data: { results: { status: string; message: string }[] } }>(
      '/api/admin/config/payment/test-connection',
      { method: 'POST', body: { provider } }
    )
    const r = res.data.results[0]
    emit('toast', `[${provider}] ${r.status === 'ok' ? '连接成功' : '连接失败'}: ${r.message}`, r.status === 'ok' ? 'success' : 'error')
  } catch (e: any) {
    emit('toast', '连接测试失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    testingConnection.value = ''
  }
}

function getPublicKeyDisplay(cfg: PaymentConfig): string {
  const pk = cfg.publicKeys
  if (!pk) return ''
  if (cfg.provider === 'stripe') return pk.publicKey || pk.publishableKey || ''
  if (cfg.provider === 'paypal') return pk.clientId || ''
  if (cfg.provider === 'google_pay') return pk.merchantId || ''
  if (cfg.provider === 'apple_iap') return pk.bundleId || ''
  return ''
}

function hasSecretsConfigured(cfg: PaymentConfig): boolean {
  return Object.values(cfg.secrets || {}).some(v => v && v.length > 0)
}

const providerEnvLabels: Record<string, string> = {
  sandbox: '沙箱', TEST: '测试', live: '生产', PRODUCTION: '生产',
}

onMounted(() => fetchConfigs())
</script>

<template>
  <div class="p-6 space-y-6 animate-fade-in text-white">
    <!-- 顶栏 -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">支付</h1>
        <p class="text-white/40 text-sm mt-1">管理 Stripe、PayPal、Google Pay、Apple IAP、手动入账等支付渠道的密钥与启停状态</p>
      </div>
      <button
        @click="fetchConfigs"
        :disabled="loading"
        class="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all bg-white/[0.08] hover:bg-white/[0.14] text-white disabled:opacity-50 cursor-pointer"
      >
        <span class="i-lucide-refresh-cw text-xs" :class="{ 'animate-spin': loading }" />
        {{ loading ? '同步中...' : '刷新' }}
      </button>
    </div>

    <!-- 渠道卡片网格 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="cfg in paymentConfigs"
        :key="cfg.provider"
        class="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-6 shadow-xl relative group flex flex-col justify-between"
      >
        <div>
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-3">
              <span class="text-[26px] font-bold text-white font-mono tracking-wide capitalize">{{ cfg.provider.replace('_', ' ') }}</span>
              <span
                class="px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase"
                :class="cfg.isEnabled
                  ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
                  : 'bg-white/5 text-white/40 border-white/10'"
              >
                {{ cfg.isEnabled ? '已启用' : '已禁用' }}
              </span>
            </div>
            <button
              @click="openEdit(cfg)"
              class="text-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold px-4 py-2 rounded-full border border-indigo-500/20 transition-all cursor-pointer"
            >
              配置密钥
            </button>
          </div>

          <p class="text-white/40 text-xs mt-3 leading-relaxed">
            {{ providerDescriptions[cfg.provider] || '支持国际主流电子钱包及订阅账单支持。' }}
          </p>

          <!-- 密钥状态摘要 -->
          <div class="mt-6 space-y-2.5 text-xs font-mono bg-black/25 p-4 rounded-xl border border-white/[0.02]">
            <div class="flex justify-between">
              <span class="text-white/35">{{ providerKeyLabel[cfg.provider] || '公钥' }}</span>
              <span class="text-white/80 truncate max-w-[200px]" :title="JSON.stringify(cfg.publicKeys)">
                {{ getPublicKeyDisplay(cfg) || '未配置' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/35">后端私钥状态</span>
              <span class="font-medium" :class="hasSecretsConfigured(cfg) ? 'text-[#30d158]' : 'text-white/20'">
                {{ hasSecretsConfigured(cfg) ? '🔒 已安全加密归集' : '⚠️ 未配置' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 底部：环境 + 操作 -->
        <div class="text-[10px] text-white/25 mt-4 border-t border-white/[0.04] pt-3 flex justify-between items-center">
          <span>
            {{ cfg.extraMeta?.environment ? providerEnvLabels[cfg.extraMeta.environment] || cfg.extraMeta.environment : '默认' }}
            · {{ cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleString() : '未更新' }}
          </span>
          <button
            @click="testConnection(cfg.provider)"
            :disabled="testingConnection === cfg.provider || !cfg.isEnabled"
            class="text-[10px] px-2 py-1 rounded border border-white/[0.08] hover:bg-white/[0.06] disabled:opacity-30 transition-all cursor-pointer"
          >
            {{ testingConnection === cfg.provider ? '测试中...' : '连接测试' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── 编辑弹窗 ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="showModal = false">
          <div class="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-8 text-white" @click.stop>
            <h2 class="text-xl font-bold mb-6">
              配置 {{ editingPayment?.provider?.replace('_', ' ') }} 支付网关
            </h2>

            <template v-if="editingPayment">
              <!-- 启用开关 -->
              <label class="flex items-center gap-3 mb-6 cursor-pointer">
                <input v-model="editingPayment.isEnabled" type="checkbox" class="w-4 h-4 accent-indigo-500">
                <span class="text-sm font-medium">启用此支付渠道</span>
                <span class="text-xs text-white/30">（关闭后 H5 收银台不展示此支付方式）</span>
              </label>

              <!-- 公开密钥（Public Keys） -->
              <div class="mb-5 space-y-4">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-white/35">公开密钥（前端 SDK）</h3>

                <!-- Stripe -->
                <template v-if="editingPayment.provider === 'stripe'">
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Publishable Key</label>
                    <input v-model="editingPayment.publicKeys.publicKey" type="text" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="pk_live_xxx...">
                  </div>
                </template>

                <!-- PayPal -->
                <template v-if="editingPayment.provider === 'paypal'">
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Client ID</label>
                    <input v-model="editingPayment.publicKeys.clientId" type="text" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="AX...">
                  </div>
                </template>

                <!-- Google Pay -->
                <template v-if="editingPayment.provider === 'google_pay'">
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Merchant ID</label>
                    <input v-model="editingPayment.publicKeys.merchantId" type="text" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="BCR2...">
                  </div>
                </template>

                <!-- Apple IAP -->
                <template v-if="editingPayment.provider === 'apple_iap'">
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Bundle ID</label>
                    <input v-model="editingPayment.publicKeys.bundleId" type="text" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="com.example.app">
                  </div>
                </template>
              </div>

              <!-- 后端私密密钥（Secrets） -->
              <div class="mb-5 space-y-4">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-white/35">后端私密密钥（仅服务器端）</h3>
                <p class="text-[10px] text-red-400/70 -mt-2 mb-2">⚠️ 这些密钥绝对不要暴露到前端！填写后即加密存储，仅显示占位符。</p>

                <template v-if="editingPayment.provider === 'stripe'">
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Secret Key</label>
                    <input v-model="editingPayment.secrets.secretKey" type="password" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="sk_live_xxx...">
                  </div>
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Webhook Signing Secret</label>
                    <input v-model="editingPayment.secrets.webhookSecret" type="password" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="whsec_xxx...">
                  </div>
                </template>

                <template v-if="editingPayment.provider === 'paypal'">
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Client Secret</label>
                    <input v-model="editingPayment.secrets.clientSecret" type="password" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="EL...">
                  </div>
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Webhook ID</label>
                    <input v-model="editingPayment.secrets.webhookId" type="text" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="2M...">
                  </div>
                </template>

                <template v-if="editingPayment.provider === 'google_pay'">
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Gateway Merchant ID</label>
                    <input v-model="editingPayment.secrets.gatewayMerchantId" type="text" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="google-merchant-id">
                  </div>
                </template>

                <template v-if="editingPayment.provider === 'apple_iap'">
                  <div>
                    <label class="text-xs text-white/50 block mb-1.5">Shared Secret</label>
                    <input v-model="editingPayment.secrets.sharedSecret" type="password" class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" placeholder="从 App Store Connect 获取的共享密钥">
                  </div>
                </template>
              </div>

              <!-- 环境配置 -->
              <div v-if="['stripe', 'paypal', 'google_pay', 'apple_iap'].includes(editingPayment.provider)" class="mb-5">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-white/35 mb-3">运行环境</h3>
                <label class="flex items-center gap-3 cursor-pointer">
                  <select v-model="editingPayment.extraMeta.environment" class="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50">
                    <option v-if="['paypal', 'apple_iap'].includes(editingPayment.provider)" value="sandbox">Sandbox（沙箱测试）</option>
                    <option v-if="['paypal', 'apple_iap'].includes(editingPayment.provider)" value="live">Live（生产环境）</option>
                    <option v-if="editingPayment.provider === 'google_pay'" value="TEST">TEST（测试）</option>
                    <option v-if="editingPayment.provider === 'google_pay'" value="PRODUCTION">PRODUCTION（生产）</option>
                    <option v-if="editingPayment.provider === 'stripe'" value="test">Test（测试模式）</option>
                    <option v-if="editingPayment.provider === 'stripe'" value="live">Live（生产模式）</option>
                  </select>
                </label>
              </div>

              <!-- 底部按钮 -->
              <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.06]">
                <button @click="showModal = false" class="px-5 py-2 text-sm rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 transition-colors cursor-pointer">取消</button>
                <button @click="testConnection(editingPayment.provider)" :disabled="testingConnection === editingPayment.provider" class="px-5 py-2 text-sm rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/80 transition-colors cursor-pointer disabled:opacity-50">
                  {{ testingConnection === editingPayment.provider ? '测试中...' : '测试连接' }}
                </button>
                <button @click="saveConfig" :disabled="saving" class="px-6 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors cursor-pointer disabled:opacity-60">
                  {{ saving ? '保存中...' : '保存配置' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.animate-fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
