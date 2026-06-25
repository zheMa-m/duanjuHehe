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
  // 一次性购买模式：使用自定义 orderUrl；否则使用订阅 API
  const subscribeUrl = props.orderUrl || `/api/starpath/subscribe/${props.platform}`
  const body: Record<string, any> = props.orderUrl
    ? {
        bizCode: 'starpath',
        sessionId: store.sessionId || '',
        platform: props.platform,
        paymentMethod,
      }
    : {
        bizCode: 'starpath',
        platform: props.platform,
        plan: props.plan,
        paymentMethod,
      }
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
    const order = await createOrder('google_iap')
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
  <div class="flex flex-col gap-[14px] w-full">
    <!-- PayPal -->
    <div v-if="paypalEnabled && !showingPaypal">
      <button
        type="button"
        class="starpath-btn-paypal"
        :disabled="loading"
        @click="handlePayPal"
      >
        <span class="text-black font-semibold tracking-tight text-[14px]">
          <span class="text-[#003087]">Pay</span><span class="text-[#009cde]">Pal</span>
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
      class="starpath-btn-pay"
      :disabled="loading"
      @click="handleGooglePay"
    >
      <span class="i-logos-google-icon size-[20px]" />
      <span class="text-[14px] font-medium">Pay</span>
    </button>

    <!-- 信用卡 -->
    <button
      v-if="cardEnabled && !showingPaypal"
      type="button"
      class="starpath-btn-card"
      :disabled="loading"
      @click="handleCard"
    >
      <span class="i-heroicons-credit-card-solid text-white size-[20px]" />
      <span class="text-[14px] font-medium text-white">Credit / Debit Card</span>
    </button>

    <!-- 无可用支付渠道 -->
    <p v-if="!hasAnyPayment" class="text-center text-sm text-starpath-text-muted py-[12px]">
      {{ t('starpath.subscribe.noPaymentMethods') }}
    </p>

    <!-- Loading -->
    <p v-if="loading && !showingPaypal" class="text-center text-sm text-starpath-text-muted">
      {{ t('starpath.subscribe.processing') }}
    </p>

    <!-- Error -->
    <p v-if="errorMessage" class="text-center text-sm text-red-400">
      {{ errorMessage }}
    </p>
  </div>
</template>
