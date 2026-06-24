<script setup lang="ts">
const route = useRoute()
const subdomain = computed(() => {
  const sub = route.params.subdomain
  if (Array.isArray(sub)) {
    return sub[0] || 'h5-v1'
  }
  return sub || 'h5-v1'
})

interface Campaign {
  subdomain: string
  title: string
  subtitle: string
  badge: string
  color_from: string
  color_to: string
}

interface CampaignResponse {
  success: boolean
  message: string
  timestamp: string
  data: Campaign
}

const email = ref('')
const phone = ref('')
const emailError = ref('')
const phoneError = ref('')
const isSubmitted = ref(false)
const isLoading = ref(false)
const isPurchasing = ref(false)

// 局部轻量 Toast 提醒，替代原生 alert
const showToast = ref(false)
const toastMessage = ref('')
const triggerToast = (msg: string) => {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2500)
}

const { user, isLoggedIn, isAnonymous, signInAnonymously } = useAuth()
const { t } = useI18n()
const { trackEvent } = useAnalytics()
const showLoginModal = ref(false)
const loginMode = ref<'login' | 'register' | 'bind'>('login')
const pendingAction = ref<(() => void) | null>(null)

// 支付与商品自适应匹配矩阵
const ticketNo = ref(Math.floor(Math.random() * 90000) + 10000)
const { createAndRedirect } = usePayment()

const currentProduct = computed(() => {
  const sub = subdomain.value.toLowerCase()
  if (sub === 'cloud') {
    return { id: 'p2', name: 'HEHE Enterprise 全套方案', price: 299.00 }
  }
  return { id: 'p1', name: 'HEHE Pro 工具套件', price: 29.99 }
})

// 统一执行拦截：需要正式登录（非匿名）的操作
const ensureLoggedInForAction = (action: () => void): boolean => {
  if (!isLoggedIn.value) {
    // 若已是匿名用户，则拉起绑定（bind）模式一键升级；若完全未登录，则拉起登录（login）模式
    loginMode.value = isAnonymous.value ? 'bind' : 'login'
    pendingAction.value = action
    showLoginModal.value = true
    return false
  }
  return true
}

const handlePurchase = async () => {
  if (!ensureLoggedInForAction(() => handlePurchase())) return
  // 进行购买前打点（不上报用户信息，仅上报商品信息）
  trackEvent('purchase_initiate', {
    item_id:   currentProduct.value.id,
    item_name: currentProduct.value.name,
    value:     currentProduct.value.price,
    currency:  'USD',
    channel:   subdomain.value,
  })
  isPurchasing.value = true
  try {
    await createAndRedirect({
      productId: currentProduct.value.id,
      productName: currentProduct.value.name,
      amount: currentProduct.value.price,
      currency: 'USD',
    })
  } catch (e: any) {
    triggerToast(e.data?.statusMessage || 'Payment failed, please try again')
  } finally {
    isPurchasing.value = false
  }
}

// 一键复制票券编码
const copyTicketNo = async () => {
  try {
    await navigator.clipboard.writeText(ticketNo.value.toString())
    triggerToast('票券编码已成功复制到剪贴板！')
  } catch {
    triggerToast('复制失败，请手动选择复制。')
  }
}

// 登录成功回调
const onLoginSuccess = () => {
  showLoginModal.value = false
  if (pendingAction.value) {
    const action = pendingAction.value
    pendingAction.value = null
    action()
  }
}

const showRegisterModal = () => {
  loginMode.value = 'register'
  showLoginModal.value = true
}

const handleLoginRequired = () => {
  loginMode.value = isAnonymous.value ? 'bind' : 'login'
  showLoginModal.value = true
}

// -------------------------------------------------------------
// 💡 最佳实践：使用 SWR 数据驱动 (前端秒级同步后台配置变更)
// -------------------------------------------------------------
const { data: response, error: fetchError } = await useFetch<CampaignResponse>(`/api/v1/campaigns/${subdomain.value}`)
const campaign = computed(() => response.value?.data)
const hasError = computed(() => !!fetchError.value || !campaign.value)

// 统一 SEO 注入（使用活动数据驱动标题和描述）
useAppSEO({
  title: () => campaign.value?.title || (hasError.value ? '营销活动已结束 - HEHE' : subdomain.value),
  description: () => campaign.value?.subtitle || 'HEHE 营销 H5 矩阵平台',
})

// 背景光圈逻辑计算
const themeGlow = computed(() => {
  const sub = subdomain.value.toLowerCase()
  if (sub === 'ai') return 'bg-purple-500/10'
  if (sub === 'cloud') return 'bg-blue-500/10'
  return 'bg-rose-500/10'
})

// 表单输入校验与实时清空报错
watch(phone, () => { phoneError.value = '' })
watch(email, () => { emailError.value = '' })

const validateForm = (): boolean => {
  let valid = true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^1[3-9]\d{9}$/ // 匹配 11 位国内手机号

  if (!phone.value) {
    phoneError.value = '手机号不能为空'
    valid = false
  } else if (!phoneRegex.test(phone.value)) {
    phoneError.value = '手机号格式不正确（请输入11位中国大陆手机号）'
    valid = false
  }

  if (!email.value) {
    emailError.value = '邮箱地址不能为空'
    valid = false
  } else if (!emailRegex.test(email.value)) {
    emailError.value = '邮箱格式不正确'
    valid = false
  }

  return valid
}

const handleRegister = async () => {
  if (!validateForm()) return
  isLoading.value = true
  try {
    await $fetch<any>('/api/v1/campaigns/register', {
      method: 'POST',
      body: { phone: phone.value, email: email.value, subdomain: subdomain.value }
    })
    isSubmitted.value = true
    // 成功打点（严禁上报明文邮筱/手机号）
    trackEvent('campaign_register', {
      channel: subdomain.value,
    })
  } catch (e: any) {
    triggerToast(e.data?.statusMessage || t('h5.registerFailed'))
  } finally {
    isLoading.value = false
  }
}

// 首次挂载：静默匿名登录
onMounted(async () => {
  if (!user.value) {
    try {
      await signInAnonymously()
    } catch (e) {
      console.error('H5 自动静默匿名登录失败:', e)
    }
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen p-4 md:p-8 bg-slate-950 relative overflow-hidden">
    <!-- 用户认证弹窗 -->
    <H5LoginModal
      :visible="showLoginModal"
      :mode="loginMode"
      @close="showLoginModal = false"
      @success="onLoginSuccess"
    />


    <!-- 动态背景发光圈 -->
    <div 
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] rounded-full blur-[100px] pointer-events-none transition-all duration-700"
      :class="themeGlow"
    ></div>

    <!-- 手机模拟框体容器 -->
    <div class="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl p-3 aspect-[9/19] flex flex-col overflow-hidden ring-12 ring-slate-800/40">
      <!-- 手机顶部刘海屏 -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-slate-950 rounded-b-2xl z-30 flex items-center justify-around px-4">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
        <span class="w-10 h-1 bg-slate-800 rounded-full"></span>
      </div>

      <!-- 手机屏幕内部 -->
      <div class="flex-1 rounded-[32px] overflow-y-auto bg-slate-950 border border-slate-800/50 p-6 pt-10 flex flex-col justify-between relative z-10 scrollbar-none">
        
        <!-- 用户状态栏 -->
        <H5UserBar
          @login="loginMode = 'login'; showLoginModal = true"
          @register="showRegisterModal"
          @logout="showLoginModal = false"
        />

        <template v-if="!hasError">
          <!-- 头部导航与子活动状态 -->
          <div class="space-y-4 mt-4">
            <div class="flex justify-between items-center text-xs text-slate-500">
              <span>HEHE H5 Mobile</span>
              <span class="font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">{{ t('h5.swrRender') }}</span>
            </div>

            <!-- 子域名状态卡片 -->
            <div class="p-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] text-slate-400">
              {{ t('h5.campaignSubdomain') }}：<code class="text-white font-semibold">{{ subdomain }}.yourdomain.localhost</code>
            </div>
          </div>

          <!-- 中部动态营销卡片区 -->
          <div class="my-6 flex-1 flex flex-col justify-center">
            <div v-if="!isSubmitted && campaign" class="space-y-6">
              <div>
                <span 
                  class="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r text-white mb-3"
                  :class="(campaign.color_from || 'from-rose-600') + ' ' + (campaign.color_to || 'to-orange-600')"
                >
                  {{ campaign.badge }}
                </span>
                <h1 class="text-xl font-extrabold text-white tracking-tight leading-snug">
                  {{ campaign.title }}
                </h1>
                <p class="text-slate-400 text-xs mt-3 leading-relaxed">
                  {{ campaign.subtitle }}
                </p>
              </div>

              <!-- 表单区 -->
              <form @submit.prevent="handleRegister" class="space-y-3">
                <div>
                  <input 
                    v-model="phone" 
                    type="tel" 
                    :placeholder="t('h5.phonePlaceholder')"
                    required
                    class="w-full bg-slate-900/80 border border-slate-700/50 hover:border-slate-600 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  />
                  <span v-if="phoneError" class="text-[9px] text-rose-400 mt-1.5 block text-left">{{ phoneError }}</span>
                </div>
                <div>
                  <input 
                    v-model="email" 
                    type="email" 
                    :placeholder="t('h5.emailPlaceholder')"
                    required
                    class="w-full bg-slate-900/80 border border-slate-700/50 hover:border-slate-600 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  />
                  <span v-if="emailError" class="text-[9px] text-rose-400 mt-1.5 block text-left">{{ emailError }}</span>
                </div>
                <button 
                  type="submit" 
                  :disabled="isLoading || !!phoneError || !!emailError"
                  class="w-full font-bold text-xs py-3 rounded-xl transition-all shadow-lg active:scale-[0.97] text-white flex items-center justify-center gap-2"
                  :class="[isLoading || !!phoneError || !!emailError ? 'opacity-40 cursor-not-allowed bg-slate-700 text-slate-400' : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-500/25']"
                >
                  <span v-if="isLoading" class="i-lucide-loader-circle animate-spin text-[13px]" />
                  {{ isLoading ? t('h5.submitting') : t('h5.submitRegister') }}
                </button>
              </form>

            </div>

            <!-- 预约成功态（虚拟票券） -->
            <div v-else-if="isSubmitted" class="text-center space-y-6 animate-fade-in">
              <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <span class="i-lucide-check text-[20px]" />
              </div>
              <h2 class="text-lg font-bold text-white">{{ t('h5.registerSuccess') }}</h2>
              
              <!-- 发光电子门票 -->
              <div class="shimmer-card relative p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/20 overflow-hidden shadow-xl shadow-indigo-500/10">
                <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                <div class="text-[10px] text-slate-500 uppercase tracking-widest text-left">{{ t('h5.ticketTitle') }}</div>
                <div class="text-lg font-black text-white mt-2 tracking-tight text-left">{{ currentProduct.name }}</div>
                
                <div class="flex items-center justify-between mt-1">
                  <div class="text-[9px] font-mono text-indigo-400">NO. {{ ticketNo }}</div>
                  <button 
                    @click="copyTicketNo"
                    class="text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    复制
                  </button>
                </div>
                
                <div class="border-t border-dashed border-slate-800 my-4"></div>
                
                <div class="grid grid-cols-2 gap-2 text-left text-[9px] text-slate-400">
                  <div>
                    <span class="block text-slate-500">{{ t('h5.ticketChannel') }}</span>
                    <span class="text-slate-200 font-semibold">{{ subdomain }}</span>
                  </div>
                  <div>
                    <span class="block text-slate-500">{{ t('h5.ticketTime') }}</span>
                    <span class="text-slate-200 font-semibold">Live Now</span>
                  </div>
                </div>
              </div>

              <button 
                @click="isSubmitted = false; phone = ''; email = '';" 
                class="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
              >
                {{ t('h5.reRegister') }}
              </button>

              <!-- 付费引导按钮 -->
              <button
                @click="handlePurchase"
                :disabled="isPurchasing"
                class="w-full font-bold text-[11px] py-3 rounded-xl transition-all shadow-lg active:scale-[0.97] text-white flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-orange-500/20 cursor-pointer"
                :class="[isPurchasing ? 'opacity-50 cursor-wait' : '']"
              >
                <span v-if="isPurchasing" class="i-lucide-loader-circle animate-spin text-[13px]" />
                {{ isPurchasing ? t('h5.processing') : `升级 ${currentProduct.name} ($${currentProduct.price})` }}
              </button>

              <!-- 社交分享 -->
              <div class="pt-2 border-t border-dashed border-slate-800">
                <p class="text-[9px] text-slate-500 text-center mb-2">{{ t('h5.shareTitle') }}</p>
                <div class="flex justify-center">
                  <SharedSocialShare
                    :title="campaign?.title || currentProduct.name"
                    :description="campaign?.subtitle || ''"
                    :subdomain="subdomain"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 用户评价区 -->
          <div class="mt-6 pt-4 border-t border-slate-800/50">
            <H5ReviewSection
              :subdomain="subdomain"
              @login-required="handleLoginRequired"
            />
          </div>


        </template>

        <template v-else>
          <div class="flex-1 flex flex-col items-center justify-center text-center space-y-5 my-auto py-10 animate-fade-in">
            <div class="w-14 h-14 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center shadow-inner shadow-white/5">
              <span class="i-lucide-power-off text-[20px] text-slate-500" />
            </div>
            <div class="space-y-2">
              <h2 class="text-sm font-bold text-slate-200">活动已结束或不存在</h2>
              <p class="text-[10px] text-slate-500 max-w-[220px] mx-auto leading-relaxed">
                营销子域名 <code class="text-indigo-400 font-semibold">{{ subdomain }}</code> 暂无生效的推广活动。请稍后再试或返回首页。
              </p>
            </div>
            <NuxtLink 
              to="/" 
              class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white active:scale-95 transition-all shadow-md shadow-indigo-600/20"
            >
              返回官网首页
            </NuxtLink>
          </div>
        </template>

        <!-- 底部声明 -->
        <div class="text-center">
          <p class="text-[9px] text-slate-600 leading-normal">
            {{ t('h5.footerNote') }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- 顶部浮动 Toast 通知 -->
  <Transition name="toast-fade">
    <div v-if="showToast" class="fixed top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 border border-white/10 rounded-xl shadow-2xl z-9999 text-[11px] font-semibold text-indigo-300 backdrop-blur-md">
      {{ toastMessage }}
    </div>
  </Transition>
</template>

<style scoped>
/* 扫光动效 — 更平滑的渐变过渡 */
.shimmer-card {
  position: relative;
  overflow: hidden;
}
.shimmer-card::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255, 255, 255, 0.06) 45%,
    rgba(255, 255, 255, 0.12) 50%,
    rgba(255, 255, 255, 0.06) 55%,
    transparent 70%
  );
  animation: shimmer 3.5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  60%  { transform: translateX(100%); }
  100% { transform: translateX(100%); }
}

@media (prefers-reduced-motion: reduce) {
  .shimmer-card::after {
    animation: none;
    display: none;
  }
}

/* Toast 动画 */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

</style>
