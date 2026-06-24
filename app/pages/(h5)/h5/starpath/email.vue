<script setup lang="ts">
const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Email',
  alias: ['/h5/starpath/问卷页面-填写邮箱'],
})

import { useStarpathStore } from '~/stores/starpath'

const router = useRouter()
const store = useStarpathStore()
const { next: flowNext } = useStarpathFlow()

const email = ref('')
const agreed = ref(false)
const submitting = ref(false)
const emailError = ref('')
const touched = ref(false)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(): boolean {
  if (!email.value.trim()) {
    emailError.value = ''
    return false
  }
  if (!EMAIL_REGEX.test(email.value.trim())) {
    emailError.value = t('starpath.email.invalid')
    return false
  }
  emailError.value = ''
  return true
}

function onEmailBlur() {
  touched.value = true
  validateEmail()
}

function onEmailInput() {
  if (touched.value) {
    validateEmail()
  }
}

async function submit() {
  if (!email.value.trim() || !agreed.value || submitting.value) return
  if (!validateEmail()) {
    touched.value = true
    return
  }
  submitting.value = true
  store.setEmail(email.value.trim(), agreed.value)

  try {
    const { data, error } = await useFetch('/api/h5/starpath/email/submit', {
      method: 'POST',
      body: {
        bizCode: 'starpath',
        email: email.value.trim(),
        agreedTerms: agreed.value,
      },
    })
    if (error.value) throw error.value
    // Detect platform and redirect to appropriate subscribe page
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isAndroid = /android/i.test(navigator.userAgent)
    if (isIOS) {
      router.push('/h5/starpath/subscribe/ios')
    } else if (isAndroid) {
      router.push('/h5/starpath/subscribe/android')
    } else {
      router.push('/h5/starpath/subscribe')
    }
  } catch (e) {
    console.error('Failed to submit email', e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <StarpathLayout show-lock data-node-id="email-page">
    <h1 class="mx-auto w-[301px] mt-[60px] text-center text-[20px] font-bold text-white">
      {{ t('starpath.email.title') }}
    </h1>

    <p class="mx-auto mt-[14px] w-[280px] text-center text-sm text-starpath-text-muted">
      {{ t('starpath.email.subtitle') }}
    </p>

    <div class="mx-auto mt-[40px] w-[343px]">
      <input
        v-model="email"
        type="email"
        :placeholder="t('starpath.email.placeholder')"
        class="w-full h-[48px] rounded-[10px] bg-starpath-option-bg px-[16px] text-white text-[14px] placeholder:text-starpath-text-muted outline-none border transition-colors"
        :class="emailError && touched ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-[#bab3f3]'"
        @blur="onEmailBlur"
        @input="onEmailInput"
      >
      <p v-if="emailError && touched" class="mt-[6px] text-[12px] text-red-400 leading-[18px]">
        {{ emailError }}
      </p>
    </div>

    <div class="mx-auto mt-[12px] w-[343px]">
      <div class="flex items-start gap-[8px] cursor-pointer" @click="agreed = !agreed">
        <div
          class="mt-[2px] size-[18px] rounded-[4px] border flex items-center justify-center shrink-0"
          :class="agreed ? 'bg-[#bab3f3] border-[#bab3f3]' : 'bg-white/10 border-white/40'"
        >
          <span v-if="agreed" class="i-lucide-check text-[10px] text-white" />
        </div>
        <span class="text-[12px] text-starpath-text-muted leading-[18px]">
          {{ t('starpath.email.terms') }}
        </span>
      </div>
    </div>

    <div class="mx-auto mt-[40px] w-[343px]">
      <StarpathPrimaryButton
        :disabled="!email.trim() || !agreed || submitting"
        @click="submit"
      >
        {{ submitting ? t('starpath.common.loading') : t('starpath.email.submit') }}
      </StarpathPrimaryButton>
    </div>
  </StarpathLayout>
</template>
