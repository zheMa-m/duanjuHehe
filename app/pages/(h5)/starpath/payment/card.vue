<script setup lang="ts">
const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Card Payment',
  alias: ['/starpath/信用卡支付-1'],
})

import http from '#shell/http'

const route = useRoute()
const router = useRouter()
const CARD_PAYMENT_ENDPOINT = '/api/starpath/payment/card'

// 从 query 参数获取预创建的订单 ID
const orderId = computed(() => (route.query.orderId as string) || '')

const cardNumber = ref('')
const expiry = ref('')
const cvc = ref('')
const cardholderName = ref('')
const loading = ref(false)
const errorMsg = ref('')

function formatCardNumber(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 4)
  if (digits.length > 2) return digits.slice(0, 2) + ' / ' + digits.slice(2)
  return digits
}

async function submitPayment() {
  if (!cardNumber.value || !expiry.value || !cvc.value || !cardholderName.value) return
  if (!orderId.value) {
    errorMsg.value = 'Missing order ID. Please go back and try again.'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    // 构造 paymentToken（真实集成时由 Stripe Elements 生成）
    const paymentToken = `tok_visa_${Date.now()}`
    await http.post(CARD_PAYMENT_ENDPOINT, {
      bizCode: 'starpath',
      orderId: orderId.value,
      paymentToken,
      cardholderName: cardholderName.value,
    })
    navigateTo(`/starpath/payment/confirmation?orderId=${orderId.value}`)
  } catch (e: any) {
    errorMsg.value = e?.message || 'Payment failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top">
      <div class="relative z-10 px-4 pb-8">
        <!-- Header -->
        <div class="flex items-center mt-[16px]">
          <button type="button" class="size-[32px] flex items-center justify-center" @click="router.back()">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <h1 class="flex-1 text-center text-base font-semibold text-white mr-[32px]">
            Credit / Debit Card
          </h1>
        </div>

        <!-- Card Preview -->
        <div class="mt-[24px] w-full h-[180px] rounded-[16px] bg-gradient-to-br from-[#2a1f5e] to-[#1a1a2e] border border-[#bab3f3]/30 p-[20px] flex flex-col justify-between">
          <div class="flex justify-between items-start">
            <span class="text-xs text-starpath-text-muted">{{ t('starpath.cardPayment.cardNumber') }}</span>
            <span class="text-lg">💳</span>
          </div>
          <div>
            <p class="text-lg tracking-[4px] font-mono text-white">
              {{ cardNumber || '••••  ••••  ••••  ••••' }}
            </p>
            <div class="flex gap-[24px] mt-[8px]">
              <div>
                <p class="text-[10px] text-starpath-text-muted">{{ t('starpath.cardPayment.expiry') }}</p>
                <p class="text-sm font-mono text-white">{{ expiry || 'MM / YYYY' }}</p>
              </div>
              <div>
                <p class="text-[10px] text-starpath-text-muted">CVC</p>
                <p class="text-sm font-mono text-white">{{ cvc || '•••' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Form -->
        <div class="mt-[24px]">
          <h2 class="text-sm font-semibold text-white">{{ t('starpath.cardPayment.cardNumber') }}</h2>
          <input
            :value="formatCardNumber(cardNumber)"
            @input="cardNumber = formatCardNumber(($event.target as HTMLInputElement).value)"
            type="text"
            inputmode="numeric"
            maxlength="19"
            :placeholder="t('starpath.cardPayment.cardNumberPlaceholder')"
            class="mt-[8px] w-full h-[48px] rounded-[10px] bg-starpath-option-bg px-[16px] text-white text-[14px] placeholder:text-starpath-text-muted outline-none border border-transparent focus:border-[#bab3f3] transition-colors"
          >
        </div>

        <div class="mt-[16px] flex gap-[12px]">
          <div class="flex-1">
            <h2 class="text-sm font-semibold text-white">{{ t('starpath.cardPayment.expiry') }}</h2>
            <input
              :value="formatExpiry(expiry)"
              @input="expiry = formatExpiry(($event.target as HTMLInputElement).value)"
              type="text"
              inputmode="numeric"
              maxlength="7"
              :placeholder="t('starpath.cardPayment.expiryPlaceholder')"
              class="mt-[8px] w-full h-[48px] rounded-[10px] bg-starpath-option-bg px-[16px] text-white text-[14px] placeholder:text-starpath-text-muted outline-none border border-transparent focus:border-[#bab3f3] transition-colors"
            >
          </div>
          <div class="w-[120px]">
            <h2 class="text-sm font-semibold text-white">{{ t('starpath.cardPayment.cvc') }}</h2>
            <input
              v-model="cvc"
              type="text"
              inputmode="numeric"
              maxlength="4"
              placeholder="•••"
              class="mt-[8px] w-full h-[48px] rounded-[10px] bg-starpath-option-bg px-[16px] text-white text-[14px] placeholder:text-starpath-text-muted outline-none border border-transparent focus:border-[#bab3f3] transition-colors"
            >
          </div>
        </div>

        <div class="mt-[16px]">
          <h2 class="text-sm font-semibold text-white">{{ t('starpath.cardPayment.cardholderName') }}</h2>
          <input
            v-model="cardholderName"
            type="text"
            placeholder="John Doe"
            class="mt-[8px] w-full h-[48px] rounded-[10px] bg-starpath-option-bg px-[16px] text-white text-[14px] placeholder:text-starpath-text-muted outline-none border border-transparent focus:border-[#bab3f3] transition-colors"
          >
        </div>

        <p v-if="errorMsg" class="mt-[12px] text-sm text-red-400 text-center">{{ errorMsg }}</p>

        <StarpathPrimaryButton
          class="mt-[32px] w-full"
          :loading="loading"
          :disabled="!cardNumber || !expiry || !cvc || !cardholderName"
          @click="submitPayment"
        >
          Pay Now
        </StarpathPrimaryButton>
      </div>
    </div>
  </div>
</template>
