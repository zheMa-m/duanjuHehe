<script setup lang="ts">
/**
 * 智能问卷 Payment Buttons — 多支付渠道 SDK 集成
 *
 * 在用户点击支付按钮后：
 *  1. 通过 subscribe API 创建订单
 *  2. 动态加载对应渠道的支付 SDK
 *  3. 完成支付确认后更新 store 并携带订单详情跳转成功页
 *
 * 渠道联动：根据后台 payment_configs 的 is_enabled 自动显隐按钮。
 *
 * Props:
 *  - plan: 订阅方案（trial-7d | monthly）
 *  - platform: 当前平台（ios | android）
 *
 * Events:
 *  - card: 跳转至信用卡填写页（保留原有行为）
 *  - paymentComplete: 支付完成后触发
 */
import { loadPayPalSdk, loadGooglePaySdk } from '~/utils/payment-loader'
import { useStarpathStore } from '~/stores/starpath'

const props = withDefaults(defineProps<{
  plan?: 'trial-7d' | 'monthly'
  platform?: 'ios' | 'android'
  /** 一次性购买模式：自定义订单创建 URL（替代默认 subscribe API） */
  orderUrl?: string
  /** 支付成功后跳转路径（替代默认 success 页） */
  successUrl?: string
}>(), {
  plan: 'trial-7d',
  platform: 'ios',
})

const emit = defineEmits<{
  card: []
  paymentComplete: []
}>()

const { t } = useI18n()
const router = useRouter()
const store = useStarpathStore()

// ── 支付渠道配置（从 DB payment_configs 读取，含公钥/环境等全部配置）──
const { data: paymentConfigs } = await useFetch('/api/v1/payments/config')

const paypalEnabled = computed(() => !!(paymentConfigs.value?.data?.paypal?.enabled))
const googlePayEnabled = computed(() => !!(paymentConfigs.value?.data?.google_pay?.enabled))
const cardEnabled = computed(() => !!(paymentConfigs.value?.data?.stripe?.enabled))

// 公钥与环境参数（全部来自 DB，不再依赖 env var）
const paypalClientId    = computed(() => paymentConfigs.value?.data?.paypal?.clientId || 'test')
const googlePayMerchant = computed(() => paymentConfigs.value?.data?.google_pay?.merchantId || '0123456789')
const googlePayEnv      = computed(() => (paymentConfigs.value?.data?.google_pay?.meta?.environment as string) || 'TEST')
const stripePublicKey   = computed(() => paymentConfigs.value?.data?.stripe?.publicKey || '')

const hasAnyPayment = computed(() => paypalEnabled.value || googlePayEnabled.value || cardEnabled.value)

// ── 状态 ──
const loading = ref(false)
const errorMessage = ref('')
const showingPaypal = ref(false)

// 当前进行中的订单信息（用于传给成功页）
const currentOrder = ref<{ orderId: string; amount: number; currency: string; provider: string } | null>(null)

// ── 提供商标识映射 ──
const PROVIDER_LABELS: Record<string, string> = {
  paypal: 'PayPal',
  google_pay: 'Google Pay',
  stripe: 'Credit / Debit Card',
  apple_iap: 'Apple Pay',
}

// ── 创建订单 ──
async function createOrder(paymentMethod: string): Promise<{ orderId: string; amount: number; currency: string }> {
  // sessionId 校验（一次性购买模式必须有 session）
  if (props.orderUrl && !store.sessionId) {
    throw new Error('Session expired, please restart the questionnaire')
  }
  // 一次性购买模式：使用自定义 orderUrl；否则使用订阅 API
  const subscribeUrl = props.orderUrl || `/api/starpath/subscribe/${props.platform}`
  const body: Record<string, any> = props.orderUrl
    ? {
        bizCode: 'starpath',
        sessionId: store.sessionId,
        platform: props.platform,
        paymentMethod,
      }
    : {
        bizCode: 'starpath',
        platform: props.platform,
        plan: props.plan,
        paymentMethod,
      }
  try {
    const res = await $fetch<any>(subscribeUrl, {
      method: 'POST',
      body,
    })
    if (!res?.data?.orderId) {
      throw new Error('Failed to create order')
    }
    return {
      orderId: res.data.orderId,
      amount: res.data.amount || 7.99,
      currency: res.data.currency || 'USD',
    }
  } catch (e: any) {
    // 解析具体错误，翻译为用户可读消息
    const status = e?.response?.status || e?.statusCode || e?.status
    const msg = e?.response?._data?.statusMessage || e?.data?.statusMessage || e?.message || ''
    if (status === 400 && msg.includes('not yet completed')) {
      throw new Error(t('starpath.purchase.sessionError'))
    }
    if (status === 404 || msg.includes('Session not found')) {
      throw new Error(t('starpath.purchase.sessionError'))
    }
    throw e
  }
}

// ── 确认支付 ──
async function confirmPayment(orderId: string, provider: string, payload: Record<string, any>): Promise<{ receiptId: string }> {
  const endpoints: Record<string, string> = {
    paypal: '/api/starpath/payment/paypal',
    google_pay: '/api/starpath/payment/google-pay',
  }
  const url = endpoints[provider]
  if (!url) throw new Error(`No confirm endpoint for ${provider}`)

  const res = await $fetch<any>(url, {
    method: 'POST',
    body: { orderId, ...payload },
  })
  return {
    receiptId: res?.data?.receiptId || `rcpt_${Date.now()}`,
  }
}

// ── 完成支付：携带订单详情跳转成功页 ──
function onPaymentSuccess(order: { orderId: string; amount: number; currency: string; provider: string }, receiptId: string = '') {
  // 一次性购买模式：更新 purchase 状态；否则更新 subscription 状态
  if (props.successUrl) {
    store.setPurchase({ purchased: true, orderId: order.orderId, plan: 'one-time-report' })
  } else {
    store.setSubscription({ platform: props.platform, paid: true, plan: props.plan })
  }
  const providerLabel = PROVIDER_LABELS[order.provider] || order.provider
  const qs = new URLSearchParams({
    plan: props.plan,
    amount: order.amount.toFixed(2),
    currency: order.currency,
    provider: providerLabel,
    receiptId,
    orderId: order.orderId,
  }).toString()
  // 一次性购买模式：跳转到自定义 successUrl；否则跳平台 success 页
  if (props.successUrl) {
    router.push(`${props.successUrl}?${qs}`)
  } else {
    router.push(`/starpath/success/${props.platform}?${qs}`)
  }
  emit('paymentComplete')
}

// ═══════════════════════  PayPal  ═══════════════════════

async function handlePayPal() {
  loading.value = true
  errorMessage.value = ''
  try {
    const order = await createOrder('paypal')
    currentOrder.value = { ...order, provider: 'paypal' }

    const clientId = paypalClientId.value
    const paypal = await loadPayPalSdk(clientId, order.currency, 'capture')

    showingPaypal.value = true
    await nextTick()

    // 渲染 PayPal 按钮
    paypal.Buttons({
      createOrder() {
        return order.orderId
      },
      async onApprove(data: any) {
        try {
          const { receiptId } = await confirmPayment(order.orderId, 'paypal', {
            paymentId: data.orderID,
            payerId: data.payerID || 'unknown',
          })
          if (currentOrder.value) {
            onPaymentSuccess(currentOrder.value, receiptId)
          }
        } catch (e: any) {
          errorMessage.value = e?.message || 'PayPal confirmation failed'
        }
      },
      onError(err: any) {
        errorMessage.value = err?.message || 'PayPal error'
        showingPaypal.value = false
      },
      onCancel() {
        showingPaypal.value = false
      },
    }).render('#starpath-paypal-container')
  } catch (e: any) {
    errorMessage.value = e?.message || 'PayPal initialization failed'
  } finally {
    loading.value = false
  }
}

// ═══════════════════════  Google Pay  ═══════════════════════

async function handleGooglePay() {
  loading.value = true
  errorMessage.value = ''
  try {
    const order = await createOrder('google-pay')
    currentOrder.value = { ...order, provider: 'google_pay' }

    const env = googlePayEnv.value
    const paymentsClient = await loadGooglePaySdk(env as 'TEST' | 'PRODUCTION')

    const isReady = await paymentsClient.isReadyToPay({
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: ['CARD', 'TOKENIZED_CARD'],
    })

    if (!isReady.result) {
      errorMessage.value = 'Google Pay is not available on this device'
      loading.value = false
      return
    }

    const paymentDataRequest: any = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['MASTERCARD', 'VISA'],
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'stripe',
            'stripe:version': '2018-10-31',
            'stripe:publishableKey': stripePublicKey.value,
          },
        },
      }],
      merchantInfo: {
        merchantId: googlePayMerchant.value,
        merchantName: '智能问卷',
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: order.amount.toFixed(2),
        currencyCode: order.currency,
        countryCode: 'US',
      },
    }

    const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest)

    const { receiptId } = await confirmPayment(order.orderId, 'google_pay', {
      googlePayToken: JSON.stringify(paymentData),
    })
    if (currentOrder.value) {
      onPaymentSuccess(currentOrder.value, receiptId)
    }
  } catch (e: any) {
    if (e?.statusCode === 'CANCELED') {
      // User cancelled
    } else {
      errorMessage.value = e?.message || 'Google Pay failed'
    }
  } finally {
    loading.value = false
  }
}

// ═══════════════════════  Card  ═══════════════════════

function handleCard() {
  emit('card')
}
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <!-- ── Loading skeleton while fetching configs ── -->
    <template v-if="!paymentConfigs">
      <div class="w-full h-[48px] rounded-2xl bg-white/[0.04] animate-pulse" />
      <div class="w-full h-[48px] rounded-2xl bg-white/[0.04] animate-pulse" />
    </template>

    <template v-else>
      <!-- PayPal -->
      <div v-if="paypalEnabled && !showingPaypal">
        <button
          type="button"
          class="group w-full h-[48px] rounded-2xl bg-[#ffc43a] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] hover:brightness-105 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="loading"
          @click="handlePayPal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.65h6.793c2.374 0 4.135.48 5.055 1.44.432.45.708.948.84 1.514.138.59.14 1.288.003 2.133l-.01.06v.527l.407.23a2.67 2.67 0 0 1 .732.56c.35.374.572.85.66 1.416.092.585.043 1.28-.144 2.065-.214.9-.56 1.683-1.03 2.328a4.68 4.68 0 0 1-1.606 1.435c-.62.355-1.34.6-2.142.73a14.3 14.3 0 0 1-2.49.195h-.55a1.603 1.603 0 0 0-1.586 1.35l-.04.236-.674 4.28-.031.144c-.02.12-.035.17-.06.216a.283.283 0 0 1-.13.104.39.39 0 0 1-.16.034" fill="#003087"/>
            <path d="M18.33 7.146c-.022.143-.047.29-.077.443-.96 4.906-4.227 6.6-8.392 6.6h-.553a1.029 1.029 0 0 0-1.017.869l-.04.238-.674 4.278-.032.145c-.02.12-.034.17-.06.216a.283.283 0 0 1-.129.103.39.39 0 0 1-.16.034H4.063a.36.36 0 0 1-.358-.417l1.778-11.29a.486.486 0 0 1 .48-.415h5.676c3.295 0 5.868.692 6.691 3.396z" fill="#009cde"/>
          </svg>
          <span class="text-black font-semibold text-[14px] tracking-tight">
            <span v-if="loading" class="i-lucide-loader-circle animate-spin text-[14px] mr-1.5" />
            PayPal
          </span>
        </button>
      </div>

      <!-- PayPal SDK 渲染容器 -->
      <div
        v-if="paypalEnabled"
        v-show="showingPaypal"
        id="starpath-paypal-container"
        class="w-full"
      />

      <!-- Google Pay -->
      <button
        v-if="googlePayEnabled && !showingPaypal"
        type="button"
        class="group w-full h-[48px] rounded-2xl bg-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] hover:bg-white/95 disabled:opacity-50 disabled:pointer-events-none"
        :disabled="loading"
        @click="handleGooglePay"
      >
        <span class="i-logos-google-icon size-[18px]" />
        <span class="text-[14px] font-semibold text-gray-800 tracking-tight">
          <span v-if="loading" class="i-lucide-loader-circle animate-spin text-[14px] mr-1.5" />
          Google Pay
        </span>
      </button>

      <!-- 信用卡 -->
      <button
        v-if="cardEnabled && !showingPaypal"
        type="button"
        class="group w-full h-[48px] rounded-2xl bg-[#0a6fde] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none"
        :disabled="loading"
        @click="handleCard"
      >
        <span class="i-heroicons-credit-card-solid text-white size-[18px]" />
        <span class="text-[14px] font-semibold text-white tracking-tight">
          <span v-if="loading" class="i-lucide-loader-circle animate-spin text-[14px] mr-1.5" />
          Credit / Debit Card
        </span>
      </button>

      <!-- 无可用支付渠道 -->
      <div v-if="!hasAnyPayment" class="w-full px-4 py-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex flex-col items-center gap-2">
        <span class="i-lucide-wallet text-[20px] text-starpath-text-disabled" />
        <p class="text-[13px] text-starpath-text-muted text-center">
          {{ t('starpath.subscribe.noPaymentMethods') }}
        </p>
      </div>
    </template>

    <!-- Error -->
    <div v-if="errorMessage" class="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
      <span class="i-lucide-alert-circle text-[14px] text-red-400 flex-shrink-0 mt-0.5" />
      <span class="text-[12px] text-red-400 leading-snug">{{ errorMessage }}</span>
    </div>
  </div>
</template>
