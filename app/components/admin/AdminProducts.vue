<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Product {
  id: string
  name: string
  price: number
  is_active: boolean
  category: string
  archived_at: string | null
  payment_meta: Record<string, any>
  created_at: string
  updated_at: string
}

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{ refresh: []; toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

// ── 状态管理 ────────────────────────────────────────────
const products = ref<Product[]>([])
const loading = ref(false)
const syncLoading = ref(false)
const productsTotal = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 弹窗状态
const showCreateModal = ref(false)
const showEditModal = ref(false)
const saving = ref(false)
const deleteLoading = ref<Record<string, boolean>>({})

// 新建商品表单
const activeCreatePlatform = ref('stripe')
const createForm = ref({
  name: '',
  price: 0,
  mode: 'subscription' as 'payment' | 'subscription',
  stripePriceId: '',
  paypalPlanId: '',
  appleProductId: '',
  googlePayProductId: '',
  alipayProductCode: '',
  wechatPlanId: '',
  category: 'subscription' as string,
})

// 编辑商品表单
const editingProduct = ref<Product | null>(null)
const activeEditPlatform = ref('stripe')
const editForm = ref({
  name: '',
  price: 0,
  mode: 'subscription' as 'payment' | 'subscription',
  stripePriceId: '',
  paypalPlanId: '',
  appleProductId: '',
  googlePayProductId: '',
  alipayProductCode: '',
  wechatPlanId: '',
  category: 'subscription' as string,
})

const categoryFilter = ref('all')
const categoryOptions = [
  { key: 'all', label: '全部' },
  { key: 'subscription', label: '订阅' },
  { key: 'one_time', label: '一次性' },
  { key: 'addon', label: '增值' },
]
const categoryLabel: Record<string, string> = { subscription: '订阅制', one_time: '一次性购买', addon: '增值服务' }
const filteredProducts = computed(() => {
  if (categoryFilter.value === 'all') return products.value
  return products.value.filter(p => p.category === categoryFilter.value || (!p.category && categoryFilter.value === 'subscription'))
})

const totalPages = computed(() => Math.max(1, Math.ceil(productsTotal.value / pageSize.value)))

// ── 数据拉取 ────────────────────────────────────────────
const fetchProducts = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(currentPage.value))
    params.set('pageSize', String(pageSize.value))
    
    // 使用管理员端统一鉴权逻辑
    const res = await $fetch<any>(`/api/v1/products?${params.toString()}`)
    const data = res?.data || res
    
    if (data?.items) {
      products.value = data.items
      productsTotal.value = data.pagination?.total || 0
    } else {
      products.value = Array.isArray(data) ? data : []
      productsTotal.value = products.value.length
    }
  } catch (e: any) {
    products.value = []
    productsTotal.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchProducts())

const handleRefresh = async () => {
  emit('refresh')
  await fetchProducts()
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchProducts()
}

// ── 创建商品 ────────────────────────────────────────────
function openCreate() {
  activeCreatePlatform.value = 'stripe'
  createForm.value = {
    name: '',
    price: 19.90,
    mode: 'subscription',
    stripePriceId: '',
    paypalPlanId: '',
    appleProductId: '',
    googlePayProductId: '',
    alipayProductCode: '',
    wechatPlanId: '',
    category: 'subscription',
  }
  showCreateModal.value = true
}

async function handleCreateProduct() {
  if (!createForm.value.name) {
    emit('toast', '商品名称不能为空', 'error')
    return
  }
  saving.value = true
  try {
    await $fetch('/api/admin/products', {
      method: 'POST',
      body: {
        name: createForm.value.name,
        price: Number(createForm.value.price),
        category: createForm.value.category,
        paymentMeta: {
          stripe: createForm.value.stripePriceId ? { priceId: createForm.value.stripePriceId, mode: createForm.value.mode } : undefined,
          paypal: createForm.value.paypalPlanId ? { planId: createForm.value.paypalPlanId } : undefined,
          apple_iap: createForm.value.appleProductId ? { productId: createForm.value.appleProductId } : undefined,
          google_pay: createForm.value.googlePayProductId ? { productId: createForm.value.googlePayProductId } : undefined,
          alipay: createForm.value.alipayProductCode ? { productCode: createForm.value.alipayProductCode } : undefined,
          wechat: createForm.value.wechatPlanId ? { planId: createForm.value.wechatPlanId } : undefined,
        }
      }
    })
    emit('toast', '商品创建成功并完成多平台计费关联', 'success')
    showCreateModal.value = false
    await fetchProducts()
  } catch (e: any) {
    emit('toast', '商品创建失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    saving.value = false
  }
}

// ── 编辑商品 ────────────────────────────────────────────
function openEdit(product: Product) {
  editingProduct.value = product
  activeEditPlatform.value = 'stripe'
  editForm.value = {
    name: product.name,
    price: product.price,
    mode: (product.payment_meta?.stripe?.mode || 'subscription') as 'payment' | 'subscription',
    stripePriceId: product.payment_meta?.stripe?.priceId || '',
    paypalPlanId: product.payment_meta?.paypal?.planId || '',
    appleProductId: product.payment_meta?.apple_iap?.productId || '',
    googlePayProductId: product.payment_meta?.google_pay?.productId || '',
    alipayProductCode: product.payment_meta?.alipay?.productCode || '',
    wechatPlanId: product.payment_meta?.wechat?.planId || '',
    category: product.category || 'subscription',
  }
  showEditModal.value = true
}

async function handleEditProduct() {
  if (!editingProduct.value) return
  saving.value = true
  try {
    await $fetch(`/api/admin/products/${editingProduct.value.id}`, {
      method: 'PATCH',
      body: {
        name: editForm.value.name,
        price: Number(editForm.value.price),
        category: editForm.value.category,
        paymentMeta: {
          stripe: editForm.value.stripePriceId ? { priceId: editForm.value.stripePriceId, mode: editForm.value.mode } : undefined,
          paypal: editForm.value.paypalPlanId ? { planId: editForm.value.paypalPlanId } : undefined,
          apple_iap: editForm.value.appleProductId ? { productId: editForm.value.appleProductId } : undefined,
          google_pay: editForm.value.googlePayProductId ? { productId: editForm.value.googlePayProductId } : undefined,
          alipay: editForm.value.alipayProductCode ? { productCode: editForm.value.alipayProductCode } : undefined,
          wechat: editForm.value.wechatPlanId ? { planId: editForm.value.wechatPlanId } : undefined,
        }
      }
    })
    emit('toast', '商品信息修改成功', 'success')
    showEditModal.value = false
    await fetchProducts()
  } catch (e: any) {
    emit('toast', '修改失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    saving.value = false
  }
}

// ── 上下架热切换 ─────────────────────────────────────────
async function toggleShelving(product: Product) {
  const nextStatus = !product.is_active
  try {
    await $fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      body: { isActive: nextStatus }
    })
    product.is_active = nextStatus
    emit('toast', nextStatus ? `商品「${product.name}」已上架在售` : `商品「${product.name}」已下架暂存`, 'success')
  } catch (e: any) {
    emit('toast', '切换上下架状态失败: ' + (e.data?.statusMessage || e.message), 'error')
  }
}

// ── 删除商品 ──────────────────────────────────────────
async function handleDelete(product: Product) {
  const msg = product.archived_at
    ? `确定永久删除商品「${product.name}」吗？（无关联订单）`
    : `确定删除商品「${product.name}」吗？\n有历史订单时将仅归档，不会真正删除数据。`
  if (!confirm(msg)) return
  deleteLoading.value[product.id] = true
  try {
    const res = await $fetch<any>(`/api/admin/products/${product.id}`, { method: 'DELETE' })
    emit('toast', res?.message || '商品已删除/归档', 'success')
    await fetchProducts()
  } catch (e: any) {
    emit('toast', '删除失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    deleteLoading.value[product.id] = false
  }
}

// ── 一键同步 Stripe 商品 ──────────────────────────────────
async function syncStripe() {
  syncLoading.value = true
  try {
    const res = await $fetch<any>('/api/admin/products/sync-stripe', { method: 'POST' })
    emit('toast', res?.message || '同步 Stripe 商品目录成功！', 'success')
    await fetchProducts()
  } catch (e: any) {
    emit('toast', 'Stripe 同步失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    syncLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 顶栏 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">商品与定价策略</h1>
        <p class="text-white/40 text-sm mt-1">创建商品、映射 Stripe Price ID 并动态管理其上架在售状态</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- 同步 Stripe 按钮 -->
        <button
          @click="syncStripe"
          :disabled="syncLoading || loading"
          class="text-xs bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/25 text-indigo-400 font-semibold px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
        >
          <span :class="{ 'animate-spin': syncLoading }">
            <span class="i-lucide-refresh-cw text-xs"></span>
          </span>
          {{ syncLoading ? '同步中...' : '同步 Stripe 商品' }}
        </button>

        <!-- 新建商品按钮 -->
        <button
          @click="openCreate"
          class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1"
        >
          <span class="i-lucide-plus"></span>
          新建商品
        </button>
      </div>
    </div>

    <!-- 分类筛选胶囊 -->
    <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-full">
      <button
        v-for="c in categoryOptions"
        :key="c.key"
        @click="categoryFilter = c.key"
        class="text-[10px] font-semibold px-4 py-2 rounded-full transition-all cursor-pointer border-0"
        :class="categoryFilter === c.key ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:text-white/90'"
      >{{ c.label }}</button>
    </div>

    <!-- KPI 卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div class="relative p-7 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-white/[0.08] hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-blue-500/[0.04] blur-3xl group-hover:bg-blue-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-package text-[13px] text-blue-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">商品总量</span>
          </div>
          <span class="text-[42px] font-bold tracking-tight text-white font-mono leading-none">{{ filteredProducts.length }}</span>
          <div class="text-[11px] text-white/20 mt-2 font-light leading-relaxed">本地商品与渠道同步商品</div>
        </div>
      </div>
      <div class="relative p-7 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#30d158]/15 hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emerald-500/[0.04] blur-3xl group-hover:bg-emerald-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-check-circle text-[13px] text-emerald-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">在售商品</span>
          </div>
          <span class="text-[42px] font-bold tracking-tight text-[#30d158] font-mono leading-none">{{ products.filter(p => p.is_active !== false).length }}</span>
          <div class="text-[11px] text-white/20 mt-2 font-light leading-relaxed">允许前台及 H5 下单付款</div>
        </div>
      </div>
      <div class="relative p-7 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-indigo-400/15 hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-indigo-500/[0.04] blur-3xl group-hover:bg-indigo-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-trending-up text-[13px] text-indigo-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">平台均价</span>
          </div>
          <span class="text-[42px] font-bold tracking-tight text-indigo-400 font-mono leading-none">
            ${{ products.length ? (products.reduce((s, p) => s + (Number(p.price) || 0), 0) / products.length).toFixed(2) : '0.00' }}
          </span>
          <div class="text-[11px] text-white/20 mt-2 font-light leading-relaxed">在售产品均价</div>
        </div>
      </div>
    </div>

    <!-- 商品列表 -->
    <div class="bg-white/[0.03] border border-white/[0.05] rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[9px] bg-white/[0.005]">
              <th class="px-6 py-4 font-semibold font-mono">商品编号</th>
              <th class="px-6 py-4 font-semibold font-mono">商品名称</th>
              <th class="px-6 py-4 font-semibold font-mono">分类</th>
              <th class="px-6 py-4 font-semibold font-mono">价格 (USD)</th>
              <th class="px-6 py-4 font-semibold font-mono">计费关联</th>
              <th class="px-6 py-4 font-semibold font-mono text-center">状态</th>
              <th class="px-6 py-4 font-semibold font-mono text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="p in filteredProducts" :key="p.id" class="hover:bg-white/[0.01] transition-colors">
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ String(p.id).slice(0, 8) }}</td>
              <td class="px-6 py-5 text-white/95 font-medium">{{ p.name }}</td>
              <td class="px-6 py-5 text-white/50 font-mono text-xs">{{ categoryLabel[p.category] || '订阅制' }}</td>
              <td class="px-6 py-5 text-[#30d158] font-mono font-semibold">${{ Number(p.price || 0).toFixed(2) }}</td>
              <td class="px-6 py-5">
                <div class="space-y-1 text-[10px] font-mono">
                  <div v-for="platform in ['stripe','paypal','apple_iap','google_pay','alipay','wechat']" :key="platform">
                    <div v-if="p.payment_meta?.[platform]" class="flex items-center gap-1.5">
                      <span class="px-1.5 py-0.5 rounded text-[8px] uppercase font-bold"
                        :class="platform === 'stripe' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                platform === 'paypal' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                platform === 'apple_iap' ? 'bg-white/10 text-white/50 border border-white/10' :
                                platform === 'google_pay' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                platform === 'alipay' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                'bg-green-500/10 text-green-400 border border-green-500/20'"
                      >{{ platform === 'apple_iap' ? 'Apple' : platform === 'google_pay' ? 'GPay' : platform.charAt(0).toUpperCase() + platform.slice(1) }}</span>
                      <span class="text-white/60">{{ p.payment_meta[platform].priceId || p.payment_meta[platform].planId || p.payment_meta[platform].productId || p.payment_meta[platform].productCode || '已绑定' }}</span>
                    </div>
                  </div>
                  <span v-if="!p.payment_meta || !Object.keys(p.payment_meta).filter(k => ['stripe','paypal','apple_iap','google_pay','alipay','wechat'].includes(k)).length" class="text-white/20 text-xs">无计费绑定</span>
                </div>
              </td>
              <td class="px-6 py-5 text-center">
                <button
                  @click="toggleShelving(p)"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer active:scale-95"
                  :class="p.is_active !== false
                    ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
                    : 'bg-white/5 text-white/40 border-white/10'"
                >
                  {{ p.is_active !== false ? '在售' : '下架' }}
                </button>
              </td>
              <td class="px-6 py-5 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openEdit(p)" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">修改</button>
                  <button @click="handleDelete(p)" :disabled="deleteLoading[p.id]" class="text-xs text-[#ff453a]/70 hover:text-[#ff453a] font-semibold cursor-pointer disabled:opacity-40">{{ deleteLoading[p.id] ? '...' : '删除' }}</button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredProducts.length && !loading">
              <td colspan="7" class="py-12 text-center text-xs text-white/20 font-light">
                暂无商品，请点击"新建商品"或"同步 Stripe 商品"。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页控制栏 -->
    <div v-if="productsTotal > 0" class="flex items-center justify-between px-5 py-3 bg-white/[0.01] rounded-xl border border-white/[0.04]">
      <div class="text-[11px] text-white/30 font-mono">共 {{ productsTotal }} 条 · 第 {{ currentPage }}/{{ totalPages }} 页</div>
      <div class="flex items-center gap-2">
        <button @click="handlePageChange(currentPage - 1)" :disabled="currentPage <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">上一页</button>
        <button @click="handlePageChange(currentPage + 1)" :disabled="currentPage >= totalPages" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">下一页</button>
      </div>
    </div>

    <!-- ── 弹窗 1: 新建商品 Modal ── -->
    <Transition name="dropdown">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div class="w-full max-w-md bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-6 shadow-2xl relative">
          <h3 class="text-lg font-bold text-white mb-4">新建平台销售商品</h3>
          
          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">商品名称</label>
              <input
                type="text"
                v-model="createForm.name"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="例如：HEHE Pro 会员包"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">定价 (USD)</label>
              <input
                type="number"
                step="0.01"
                v-model="createForm.price"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">计费模式</label>
              <select
                v-model="createForm.mode"
                class="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="payment">一次性付款 (One-time)</option>
                <option value="subscription">周期性计费订阅 (Subscription)</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">业务分类</label>
              <select v-model="createForm.category" class="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                <option value="subscription">订阅制 (Subscription)</option>
                <option value="one_time">一次性购买 (One-time)</option>
                <option value="addon">增值服务 (Addon)</option>
              </select>
            </div>

            <!-- 平台配置标签页 -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">平台标识配置</label>
              <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-0.5 rounded-lg mb-2 flex-wrap gap-0.5">
                <button v-for="p in ['stripe','paypal','apple_iap','google_pay','alipay','wechat']" :key="p"
                  @click="activeCreatePlatform = p"
                  class="text-[9px] font-semibold px-2 py-1 rounded-md transition-all cursor-pointer border-0"
                  :class="activeCreatePlatform === p ? 'bg-indigo-500/20 text-indigo-400' : 'bg-transparent text-white/40 hover:text-white/70'"
                >{{ p === 'apple_iap' ? 'Apple' : p === 'google_pay' ? 'GPay' : p.charAt(0).toUpperCase() + p.slice(1) }}</button>
              </div>
              <input v-if="activeCreatePlatform === 'stripe'" type="text" v-model="createForm.stripePriceId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="Stripe Price ID: price_1Pxxx..." />
              <input v-if="activeCreatePlatform === 'paypal'" type="text" v-model="createForm.paypalPlanId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="PayPal Plan ID: P-xxx..." />
              <input v-if="activeCreatePlatform === 'apple_iap'" type="text" v-model="createForm.appleProductId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="Apple Product ID: com.hehe.premium.monthly" />
              <input v-if="activeCreatePlatform === 'google_pay'" type="text" v-model="createForm.googlePayProductId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="Google Pay Product ID" />
              <input v-if="activeCreatePlatform === 'alipay'" type="text" v-model="createForm.alipayProductCode"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="支付宝产品码: GENERAL_WITHHOLDING" />
              <input v-if="activeCreatePlatform === 'wechat'" type="text" v-model="createForm.wechatPlanId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="微信支付计划 ID" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-white/[0.06] pt-4">
            <button @click="showCreateModal = false" class="text-xs bg-white/5 hover:bg-white/10 text-white/70 font-semibold px-5 py-2.5 rounded-full transition-all cursor-pointer">取消</button>
            <button @click="handleCreateProduct" :disabled="saving" class="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-full transition-all active:scale-[0.98] cursor-pointer">
              {{ saving ? '保存中...' : '确认创建' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── 弹窗 2: 修改商品 Modal ── -->
    <Transition name="dropdown">
      <div v-if="showEditModal && editingProduct" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div class="w-full max-w-md bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-6 shadow-2xl relative">
          <h3 class="text-lg font-bold text-white mb-4">修改商品定价策略</h3>
          
            <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">商品名称</label>
              <input
                type="text"
                v-model="editForm.name"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">定价 (USD)</label>
              <input
                type="number"
                step="0.01"
                v-model="editForm.price"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">业务分类</label>
              <select v-model="editForm.category" class="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                <option value="subscription">订阅制 (Subscription)</option>
                <option value="one_time">一次性购买 (One-time)</option>
                <option value="addon">增值服务 (Addon)</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">计费模式</label>
              <select
                v-model="editForm.mode"
                class="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="payment">一次性付款 (One-time)</option>
                <option value="subscription">周期性计费订阅 (Subscription)</option>
              </select>
            </div>

            <!-- 平台配置标签页 -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">平台标识配置</label>
              <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-0.5 rounded-lg mb-2 flex-wrap gap-0.5">
                <button v-for="p in ['stripe','paypal','apple_iap','google_pay','alipay','wechat']" :key="p"
                  @click="activeEditPlatform = p"
                  class="text-[9px] font-semibold px-2 py-1 rounded-md transition-all cursor-pointer border-0"
                  :class="activeEditPlatform === p ? 'bg-indigo-500/20 text-indigo-400' : 'bg-transparent text-white/40 hover:text-white/70'"
                >{{ p === 'apple_iap' ? 'Apple' : p === 'google_pay' ? 'GPay' : p.charAt(0).toUpperCase() + p.slice(1) }}</button>
              </div>
              <input v-if="activeEditPlatform === 'stripe'" type="text" v-model="editForm.stripePriceId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="Stripe Price ID: price_1Pxxx..." />
              <input v-if="activeEditPlatform === 'paypal'" type="text" v-model="editForm.paypalPlanId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="PayPal Plan ID: P-xxx..." />
              <input v-if="activeEditPlatform === 'apple_iap'" type="text" v-model="editForm.appleProductId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="Apple Product ID" />
              <input v-if="activeEditPlatform === 'google_pay'" type="text" v-model="editForm.googlePayProductId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="Google Pay Product ID" />
              <input v-if="activeEditPlatform === 'alipay'" type="text" v-model="editForm.alipayProductCode"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="支付宝产品码" />
              <input v-if="activeEditPlatform === 'wechat'" type="text" v-model="editForm.wechatPlanId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="微信支付计划 ID" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-white/[0.06] pt-4">
            <button @click="showEditModal = false" class="text-xs bg-white/5 hover:bg-white/10 text-white/70 font-semibold px-5 py-2.5 rounded-full transition-all cursor-pointer">取消</button>
            <button @click="handleEditProduct" :disabled="saving" class="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-full transition-all active:scale-[0.98] cursor-pointer">
              {{ saving ? '修改中...' : '保存修改' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16,1,0.3,1); }
.dropdown-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: scale(0.97); }
</style>
