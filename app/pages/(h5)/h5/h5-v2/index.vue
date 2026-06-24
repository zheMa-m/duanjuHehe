<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'

/** 新野兽派 V2 固定演示活动 subdomain（与 DB / 子域名 h5-v2 一致） */
const subdomain = ref('h5-v2')

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

// 局部轻量 Toast 提醒
const showToast = ref(false)
const toastMessage = ref('')
const triggerToast = (msg: string) => {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2500)
}

// 认证集成，解构出需要的匿名登录与绑定状态
const { user, isLoggedIn, isAnonymous, signInAnonymously } = useAuth()
const { t } = useI18n()
const showLoginModal = ref(false)
const loginMode = ref<'login' | 'register' | 'bind'>('login')
const pendingAction = ref<(() => void) | null>(null)

// 支付与商品自适应匹配矩阵
const ticketNo = ref(Math.floor(Math.random() * 90000) + 10000)
const { createAndRedirect } = usePayment()

const currentProduct = computed(() => {
  return { id: 'p1', name: 'HEHE Pro 工具套件', price: 29.99 }
})

// 统一执行拦截：需要正式登录（非匿名）的操作
const ensureLoggedInForAction = (action: () => void): boolean => {
  if (!isLoggedIn.value) {
    loginMode.value = isAnonymous.value ? 'bind' : 'login'
    pendingAction.value = action
    showLoginModal.value = true
    return false
  }
  return true
}

const handlePurchase = async () => {
  if (!ensureLoggedInForAction(() => handlePurchase())) return
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
    triggerToast('票券编码已成功复制！')
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
// SWR 数据获取与 SEO 绑定
// -------------------------------------------------------------
const { data: response, error: fetchError } = await useFetch<CampaignResponse>(`/api/v1/campaigns/${subdomain.value}`)
const campaign = computed(() => response.value?.data)
const hasError = computed(() => !!fetchError.value || !campaign.value)

useAppSEO({
  title: () => campaign.value?.title || (hasError.value ? '活动未找到 - HEHE V2' : `${subdomain.value} - V2`),
  description: () => campaign.value?.subtitle || '新野兽派动感落地页',
})

// 表单输入校验与实时清空报错
watch(phone, () => { phoneError.value = '' })
watch(email, () => { emailError.value = '' })

const validateForm = (): boolean => {
  let valid = true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^1[3-9]\d{9}$/

  if (!phone.value) {
    phoneError.value = '手机号不能为空'
    valid = false
  } else if (!phoneRegex.test(phone.value)) {
    phoneError.value = '请输入11位中国大陆手机号'
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
      console.error('H5 V2 自动静默匿名登录失败:', e)
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-slate-100 flex flex-col items-center relative overflow-hidden font-sans selection:bg-[#39ff14] selection:text-black">
    <!-- 用户认证弹窗 -->
    <H5LoginModal
      :visible="showLoginModal"
      :mode="loginMode"
      @close="showLoginModal = false"
      @success="onLoginSuccess"
    />

    <!-- 背景科技装饰线 -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none z-0"></div>

    <!-- 顶部状态栏 -->
    <header class="w-full max-w-2xl z-20 sticky top-0">
      <H5UserBar
        @login="loginMode = 'login'; showLoginModal = true"
        @register="showRegisterModal"
        @logout="showLoginModal = false"
      />
    </header>



    <!-- 极客流动跑马灯说明条 -->
    <div class="w-full bg-[#111] border-y-2 border-white py-1.5 overflow-hidden z-10 mt-4 select-none">
      <div class="marquee-content whitespace-nowrap inline-block animate-marquee text-[10px] font-black tracking-widest text-[#39ff14]">
        <span>✦ HEHE H5 V2 NEO-BRUTALISM ✦ STALE-WHILE-REVALIDATE ✦ CONTRACT DEFENSE ✦ DYNAMIC PRODUCTS MAPPING ✦ </span>
        <span>✦ HEHE H5 V2 NEO-BRUTALISM ✦ STALE-WHILE-REVALIDATE ✦ CONTRACT DEFENSE ✦ DYNAMIC PRODUCTS MAPPING ✦ </span>
      </div>
    </div>

    <!-- 主工作区 -->
    <main class="w-full max-w-md px-4 py-8 z-10 space-y-8 flex-1 flex flex-col justify-center">
      <template v-if="!hasError">
        <!-- 中部动态营销卡片区 -->
        <div class="neo-card p-6 bg-slate-900 border-2 border-white shadow-[6px_6px_0px_0px_#39ff14] transition-all">
          <div v-if="!isSubmitted && campaign" class="space-y-6">
            <div>
              <span class="inline-block text-[9px] font-black uppercase border-2 border-[#39ff14] text-[#39ff14] bg-black px-2.5 py-0.5 mb-3 shadow-[2px_2px_0px_0px_#39ff14]">
                {{ campaign.badge }}
              </span>
              <h1 class="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                {{ campaign.title }}
              </h1>
              <p class="text-slate-400 text-xs mt-3 leading-relaxed font-medium">
                {{ campaign.subtitle }}
              </p>
            </div>

            <!-- 表单区 -->
            <form @submit.prevent="handleRegister" class="space-y-4">
              <div class="space-y-1">
                <label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">手机号 Phone</label>
                <input 
                  v-model="phone" 
                  type="tel" 
                  placeholder="请输入 11 位手机号"
                  required
                  class="w-full bg-black border-2 border-white/60 focus:border-[#39ff14] outline-none rounded-none px-4 py-2.5 text-xs text-white placeholder-slate-600 transition-all font-mono"
                />
                <span v-if="phoneError" class="text-[9px] text-rose-500 mt-1 block font-semibold animate-pulse">{{ phoneError }}</span>
              </div>
              
              <div class="space-y-1">
                <label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">邮箱 Email</label>
                <input 
                  v-model="email" 
                  type="email" 
                  placeholder="请输入您的邮箱地址"
                  required
                  class="w-full bg-black border-2 border-white/60 focus:border-[#39ff14] outline-none rounded-none px-4 py-2.5 text-xs text-white placeholder-slate-600 transition-all font-mono"
                />
                <span v-if="emailError" class="text-[9px] text-rose-500 mt-1 block font-semibold animate-pulse">{{ emailError }}</span>
              </div>

              <button 
                type="submit" 
                :disabled="isLoading || !!phoneError || !!emailError"
                class="neo-btn w-full py-3 border-2 border-white bg-[#39ff14] text-black font-black text-xs tracking-wider uppercase transition-all shadow-[4px_4px_0px_0px_#ffffff] hover:shadow-[6px_6px_0px_0px_#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:translate-x-0 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                {{ isLoading ? '提交中 SUBMITTING...' : '立即预约 SECURE SLOT' }}
              </button>
            </form>


          </div>

          <!-- 预约成功态 (3D折扣电子票) -->
          <div v-else-if="isSubmitted" class="text-center space-y-6 py-4 animate-fade-in">
            <div class="w-14 h-14 border-2 border-[#39ff14] bg-[#39ff14]/10 text-[#39ff14] flex items-center justify-center text-2xl mx-auto shadow-[4px_4px_0px_0px_rgba(57,255,20,0.2)]">
              ✔
            </div>
            <h2 class="text-lg font-black text-white uppercase tracking-tight">预约成功 REGISTERED</h2>
            
            <!-- 新野兽派折扣卡片 -->
            <div class="ticket-card relative p-6 bg-black border-2 border-[#39ff14] shadow-[6px_6px_0px_0px_rgba(57,255,20,0.15)] overflow-hidden transition-transform">
              <div class="absolute -top-4 -right-4 w-16 h-16 bg-[#39ff14]/5 rounded-full blur-xl"></div>
              <div class="text-[9px] text-[#39ff14] font-black uppercase tracking-widest text-left">{{ t('h5.ticketTitle') }}</div>
              <div class="text-xl font-black text-white mt-1 text-left uppercase tracking-tighter">{{ currentProduct.name }}</div>
              
              <div class="flex items-center justify-between mt-2">
                <div class="text-[10px] font-mono text-slate-400">NO. {{ ticketNo }}</div>
                <button 
                  @click="copyTicketNo"
                  class="text-[9px] px-3 py-1 border border-[#39ff14] bg-transparent text-[#39ff14] hover:bg-[#39ff14] hover:text-black font-bold uppercase transition-colors cursor-pointer"
                >
                  COPY
                </button>
              </div>
              
              <div class="border-t-2 border-dashed border-slate-800 my-4"></div>
              
              <div class="grid grid-cols-2 gap-2 text-left text-[9px] text-slate-500 font-mono">
                <div>
                  <span class="block uppercase">CHANNEL</span>
                  <span class="text-slate-300 font-bold">{{ subdomain }}</span>
                </div>
                <div>
                  <span class="block uppercase">STATUS</span>
                  <span class="text-[#39ff14] font-bold">READY TO UPGRADE</span>
                </div>
              </div>
            </div>

            <button 
              @click="isSubmitted = false; phone = ''; email = '';" 
              class="text-[10px] text-slate-400 hover:text-white font-bold uppercase transition-colors cursor-pointer underline"
            >
              重新预约 RE-REGISTER
            </button>

            <!-- 付费引导按钮 -->
            <button
              @click="handlePurchase"
              :disabled="isPurchasing"
              class="neo-btn w-full py-3.5 border-2 border-white bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs tracking-wider uppercase transition-all shadow-[4px_4px_0px_0px_#ffffff] hover:shadow-[6px_6px_0px_0px_#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center gap-2"
            >
              {{ isPurchasing ? '处理中...' : `购买 ${currentProduct.name} ($${currentProduct.price})` }}
            </button>

            <!-- 社交分享 -->
            <div class="pt-4 border-t-2 border-dashed border-slate-800">
              <p class="text-[9px] text-slate-500 text-center font-bold uppercase tracking-wider mb-2">分享您的专属席位 SHARE TICKET</p>
              <div class="flex justify-center bg-slate-950 p-2 border border-slate-800">
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
        <div class="neo-card p-6 bg-slate-900 border-2 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,0.05)]">
          <H5ReviewSection
            :subdomain="subdomain"
            @login-required="handleLoginRequired"
          />
        </div>


      </template>

      <!-- 404 / 异常态 -->
      <template v-else>
        <div class="neo-card p-8 bg-slate-900 border-2 border-white shadow-[6px_6px_0px_0px_#ff453a] text-center space-y-6 py-12">
          <div class="w-16 h-16 border-2 border-[#ff453a] bg-[#ff453a]/10 text-[#ff453a] flex items-center justify-center text-3xl mx-auto shadow-[4px_4px_0px_0px_rgba(255,69,58,0.2)]">
            📴
          </div>
          <div class="space-y-2">
            <h2 class="text-base font-black text-white uppercase tracking-tight">活动未激活 OFF-LINE</h2>
            <p class="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed font-mono">
              推广子域名 <code class="text-[#ff453a]">{{ subdomain }}</code> 未检测到已审批的公开活动配置。
            </p>
          </div>
          <NuxtLink 
            to="/" 
            class="neo-btn inline-block px-6 py-2.5 border-2 border-white bg-white text-black font-black text-xs tracking-wider uppercase transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            返回主站首页 HOME
          </NuxtLink>
        </div>
      </template>
    </main>

    <!-- 底部声明 -->
    <footer class="w-full py-6 text-center border-t-2 border-white bg-black z-10">
      <p class="text-[9px] text-slate-500 font-mono tracking-wider">
        {{ t('h5.footerNote') }}
      </p>
    </footer>

    <!-- 顶部浮动 Toast 通知 -->
    <Transition name="toast-fade">
      <div v-if="showToast" class="fixed top-8 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-black border-2 border-[#39ff14] text-[#39ff14] shadow-[4px_4px_0px_0px_rgba(57,255,20,0.3)] z-9999 text-[10px] font-black tracking-widest uppercase">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 极客跑马灯动画 */
.marquee-content {
  display: inline-block;
  padding-left: 100%;
}
@keyframes marquee {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}
.animate-marquee {
  animation: marquee 25s linear infinite;
  display: inline-flex;
}

/* 扫光动效 */
.ticket-card {
  position: relative;
}
.ticket-card::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(57, 255, 20, 0.15),
    transparent
  );
  animation: shimmer 4s infinite;
}
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* 3D 卡片浮动动效 */
.ticket-card:hover {
  transform: translateY(-2px) rotateX(4deg) rotateY(-4deg);
  box-shadow: 8px 8px 0px 0px rgba(57, 255, 20, 0.25);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

/* ── 深度定制子组件 H5ReviewSection ── */
:deep(.space-y-4 button[class*="border-dashed"]) {
  border: 2px dashed #ffffff !important;
  border-radius: 0px !important;
  color: #ffffff !important;
  font-family: monospace;
  text-transform: uppercase;
}
:deep(.space-y-4 button[class*="border-dashed"]:hover) {
  border-color: #39ff14 !important;
  color: #39ff14 !important;
}

:deep(.space-y-3 > div) {
  background-color: #000000 !important;
  border: 2px solid #ffffff !important;
  border-radius: 0px !important;
  box-shadow: 4px 4px 0px 0px rgba(255, 255, 255, 0.1) !important;
}

:deep(textarea) {
  background-color: #000000 !important;
  border: 2px solid #ffffff !important;
  border-radius: 0px !important;
  font-family: monospace;
}
:deep(textarea:focus) {
  border-color: #39ff14 !important;
}

:deep(.bg-slate-800) {
  background-color: #111111 !important;
  border: 1px solid #333333;
  border-radius: 0px !important;
}
:deep(.bg-amber-400) {
  background-color: #39ff14 !important;
  border-radius: 0px !important;
}
:deep(.text-amber-400) {
  color: #39ff14 !important;
}

:deep(.flex.gap-2 button) {
  border-radius: 0px !important;
  font-family: monospace;
  text-transform: uppercase;
}
:deep(.flex.gap-2 button:first-child) {
  border: 2px solid #ffffff !important;
  background-color: transparent !important;
  color: #ffffff !important;
}
:deep(.flex.gap-2 button:last-child) {
  border: 2px solid #ffffff !important;
  background-color: #39ff14 !important;
  color: #000000 !important;
}
</style>
