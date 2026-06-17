<script setup lang="ts">
const route = useRoute()
const subdomain = computed(() => {
  const sub = route.params.subdomain
  if (Array.isArray(sub)) {
    return sub[0] || 'promo'
  }
  return sub || 'promo'
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
const isSubmitted = ref(false)
const isLoading = ref(false)
const isPurchasing = ref(false)

// 认证集成（不再自动触发匿名登录，由 supabase-auth.client.ts 插件初始化 device-id）
const { isLoggedIn } = useAuth()
const { t } = useI18n()
const showLoginModal = ref(false)
const loginMode = ref<'login' | 'register' | 'bind'>('login')
const pendingAction = ref<(() => void) | null>(null)

// 支付集成
// 票券编号（提交时固定，避免重渲染时跳变）
const ticketNo = ref(Math.floor(Math.random() * 90000) + 10000)

const { createAndRedirect } = usePayment()

const handlePurchase = async () => {
  // 未登录时引导登录
  if (!isLoggedIn.value) {
    loginMode.value = 'login'
    pendingAction.value = () => handlePurchase()
    showLoginModal.value = true
    return
  }
  isPurchasing.value = true
  try {
    await createAndRedirect({
      productId: 'p1',
      productName: campaign.value?.title || 'HEHE VIP',
      amount: 29.99,
      currency: 'USD',
    })
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Payment failed, please try again')
  } finally {
    isPurchasing.value = false
  }
}

// 登录成功回调
const onLoginSuccess = () => {
  showLoginModal.value = false
  // 执行缓存的操作
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

// -------------------------------------------------------------
// 💡 最佳实践：使用 SWR 数据驱动 (前端秒级同步后台配置变更)
// -------------------------------------------------------------
const { data: response } = await useFetch<CampaignResponse>(`/api/v1/campaigns/${subdomain.value}`)
const campaign = computed(() => response.value?.data)

// 统一 SEO 注入（使用活动数据驱动标题和描述）
useAppSEO({
  title: () => campaign.value?.title || subdomain.value,
  description: () => campaign.value?.subtitle || '',
})

// 背景光圈逻辑计算
const themeGlow = computed(() => {
  const sub = subdomain.value.toLowerCase()
  if (sub === 'ai') return 'bg-purple-500/10'
  if (sub === 'cloud') return 'bg-blue-500/10'
  return 'bg-rose-500/10'
})

const handleRegister = async () => {
  if (!phone.value || !email.value) {
    alert(t('h5.fillInfo'))
    return
  }
  isLoading.value = true
  try {
    await $fetch<any>('/api/v1/campaigns/register', {
      method: 'POST',
      body: { phone: phone.value, email: email.value, subdomain: subdomain.value }
    })
    isSubmitted.value = true
  } catch (e: any) {
    alert(e.data?.statusMessage || t('h5.registerFailed'))
  } finally {
    isLoading.value = false
  }
}
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

    <!-- 顶部广告位 -->
    <ClientAdSlot position="header_banner" :subdomain="subdomain" />

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
                  class="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <input 
                  v-model="email" 
                  type="email" 
                  :placeholder="t('h5.emailPlaceholder')"
                  required
                  class="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <button 
                type="submit" 
                :disabled="isLoading"
                class="w-full font-bold text-xs py-3 rounded-xl transition-all shadow-md active:scale-95 text-white flex items-center justify-center gap-2"
                :class="[isLoading ? 'opacity-50' : '', 'bg-indigo-600 hover:bg-indigo-500']"
              >
                {{ isLoading ? t('h5.submitting') : t('h5.submitRegister') }}
              </button>
            </form>

            <!-- 原生内嵌广告位 -->
            <ClientAdSlot position="native_inline" :subdomain="subdomain" />
          </div>

          <!-- 预约成功态（虚拟票券） -->
          <div v-else-if="isSubmitted" class="text-center space-y-6 animate-fade-in">
            <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl mx-auto mb-2">
              ✔
            </div>
            <h2 class="text-lg font-bold text-white">{{ t('h5.registerSuccess') }}</h2>
            
            <!-- 发光电子门票 -->
            <div class="relative p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/30 overflow-hidden shadow-xl shadow-indigo-500/10">
              <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
              <div class="text-[10px] text-slate-500 uppercase tracking-widest">{{ t('h5.ticketTitle') }}</div>
              <div class="text-lg font-black text-white mt-2 tracking-tight">HEHE VIP</div>
              <div class="text-[9px] font-mono text-indigo-400 mt-1">NO. {{ ticketNo }}</div>
              
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
              class="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {{ t('h5.reRegister') }}
            </button>

            <!-- 付费引导按钮 -->
            <button
              @click="handlePurchase"
              :disabled="isPurchasing"
              class="w-full font-bold text-xs py-3 rounded-xl transition-all shadow-md active:scale-95 text-white flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400"
              :class="[isPurchasing ? 'opacity-50' : '']"
            >
              {{ isPurchasing ? t('h5.processing') : t('h5.purchaseVip') }}
            </button>

            <!-- 社交分享 -->
            <div class="pt-2 border-t border-dashed border-slate-800">
              <p class="text-[9px] text-slate-500 text-center mb-2">{{ t('h5.shareTitle') }}</p>
              <div class="flex justify-center">
                <SharedSocialShare
                  :title="campaign?.title || 'HEHE VIP'"
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
            @login-required="loginMode = 'login'; showLoginModal = true"
          />
        </div>

        <!-- 底部广告位 -->
        <ClientAdSlot position="footer_banner" :subdomain="subdomain" />

        <!-- 底部声明 -->
        <div class="text-center">
          <p class="text-[9px] text-slate-600 leading-normal">
            {{ t('h5.footerNote') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
