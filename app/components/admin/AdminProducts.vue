<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AdminMedia from './AdminMedia.vue'

interface Product {
  id: string
  name: string
  price: number
  is_active: boolean
  category: string
  description: string
  image_url: string
  pricing: Record<string, any>
  archived_at: string | null
  payment_meta: Record<string, any>
  created_at: string
  updated_at: string
}

const props = defineProps<{ isLoading: boolean }>()
const emit = defineEmits<{ refresh: []; toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

// ── 数据状态 ──────────────────────────────────────────
const products = ref<Product[]>([])
const loading = ref(false)
const syncLoading = ref(false)
const productsTotal = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// ── 搜索 & 排序 & 过滤 ────────────────────────────────
const searchQuery = ref('')
const sortBy = ref<'created_at' | 'price' | 'name' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const categoryFilter = ref('all')
const categoryOptions = [
  { key: 'all', label: '全部' },
  { key: 'subscription', label: '订阅' },
  { key: 'one_time', label: '一次性' },
  { key: 'addon', label: '增值' },
]
const categoryLabel: Record<string, string> = { subscription: '订阅制', one_time: '一次性购买', addon: '增值服务' }

// ── 批量操作 ──────────────────────────────────────────
const selectedIds = ref<Set<string>>(new Set())
const isAllSelected = computed(() => products.value.length > 0 && products.value.every(p => selectedIds.value.has(p.id)))
const selectedCount = computed(() => selectedIds.value.size)

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    products.value.forEach(p => selectedIds.value.add(p.id))
  }
  selectedIds.value = new Set(selectedIds.value)
}
function toggleSelect(id: string) {
  const s = new Set(selectedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selectedIds.value = s
}

// ── 弹窗 & 表单 ──────────────────────────────────────
const confirmDialog = ref()
const showFormModal = ref(false)
const isEditMode = ref(false)
const editingProductId = ref<string | null>(null)
const saving = ref(false)
const deleteLoading = ref<Record<string, boolean>>({})
const activePlatform = ref('stripe')

const defaultForm = () => ({
  name: '', price: 19.90, description: '', image_url: '',
  mode: 'subscription' as 'payment' | 'subscription',
  stripePriceId: '', paypalPlanId: '', appleProductId: '',
  googlePayProductId: '', alipayProductCode: '', wechatPlanId: '',
  category: 'subscription' as string,
  currency: 'USD', billingInterval: 'month' as string,
  trialDays: 0, compareAtPrice: null as number | null,
})
const form = ref(defaultForm())

// ── 媒体库选取器 ───────────────────────────────────────────
const showMediaPicker = ref(false)

function handleMediaSelected(file: { url: string | null; path: string }) {
  form.value.image_url = file.url || file.path
  showMediaPicker.value = false
}

const totalPages = computed(() => Math.max(1, Math.ceil(productsTotal.value / pageSize.value)))

// ── 数据拉取 ──────────────────────────────────────────
const fetchProducts = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(currentPage.value))
    params.set('pageSize', String(pageSize.value))
    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim())
    if (categoryFilter.value !== 'all') params.set('category', categoryFilter.value)
    params.set('sortBy', sortBy.value)
    params.set('sortOrder', sortOrder.value)

    const res = await $fetch<any>(`/api/admin/products?${params.toString()}`)
    const data = res?.data || res
    if (data?.items) {
      products.value = data.items
      productsTotal.value = data.pagination?.total || 0
    } else {
      products.value = Array.isArray(data) ? data : []
      productsTotal.value = products.value.length
    }
  } catch { products.value = []; productsTotal.value = 0 }
  finally { loading.value = false }
}

// 搜索/排序/过滤变化时重置并重新拉取
watch([searchQuery, sortBy, sortOrder, categoryFilter], () => {
  currentPage.value = 1
  fetchProducts()
})
watch(currentPage, () => fetchProducts())
onMounted(() => fetchProducts())

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

// ── 创建 / 编辑 ──────────────────────────────────────
function openCreate() {
  isEditMode.value = false
  editingProductId.value = null
  activePlatform.value = 'stripe'
  form.value = defaultForm()
  showFormModal.value = true
}

function openEdit(product: Product) {
  isEditMode.value = true
  editingProductId.value = product.id
  activePlatform.value = 'stripe'
  form.value = {
    name: product.name,
    price: product.price,
    description: product.description || '',
    image_url: product.image_url || '',
    mode: (product.payment_meta?.stripe?.mode || 'subscription') as 'payment' | 'subscription',
    stripePriceId: product.payment_meta?.stripe?.priceId || '',
    paypalPlanId: product.payment_meta?.paypal?.planId || '',
    appleProductId: product.payment_meta?.apple_iap?.productId || '',
    googlePayProductId: product.payment_meta?.google_pay?.productId || '',
    alipayProductCode: product.payment_meta?.alipay?.productCode || '',
    wechatPlanId: product.payment_meta?.wechat?.planId || '',
    category: product.category || 'subscription',
    currency: product.pricing?.currency || 'USD',
    billingInterval: product.pricing?.billing_interval || 'month',
    trialDays: product.pricing?.trial_days || 0,
    compareAtPrice: product.pricing?.compare_at_price ?? null,
  }
  showFormModal.value = true
}

function buildPayload() {
  return {
    name: form.value.name,
    price: Number(form.value.price),
    description: form.value.description,
    image_url: form.value.image_url,
    category: form.value.category,
    pricing: {
      base_price: Number(form.value.price),
      currency: form.value.currency,
      billing_interval: form.value.billingInterval,
      trial_days: form.value.trialDays || 0,
      compare_at_price: form.value.compareAtPrice,
    },
    paymentMeta: {
      stripe: form.value.stripePriceId ? { priceId: form.value.stripePriceId, mode: form.value.mode } : undefined,
      paypal: form.value.paypalPlanId ? { planId: form.value.paypalPlanId } : undefined,
      apple_iap: form.value.appleProductId ? { productId: form.value.appleProductId } : undefined,
      google_pay: form.value.googlePayProductId ? { productId: form.value.googlePayProductId } : undefined,
      alipay: form.value.alipayProductCode ? { productCode: form.value.alipayProductCode } : undefined,
      wechat: form.value.wechatPlanId ? { planId: form.value.wechatPlanId } : undefined,
    }
  }
}

async function handleSaveProduct() {
  if (!form.value.name) { emit('toast', '商品名称不能为空', 'error'); return }
  saving.value = true
  try {
    if (isEditMode.value && editingProductId.value) {
      await $fetch(`/api/admin/products/${editingProductId.value}`, { method: 'PATCH', body: buildPayload() })
      emit('toast', '商品信息修改成功', 'success')
    } else {
      await $fetch('/api/admin/products', { method: 'POST', body: buildPayload() })
      emit('toast', '商品创建成功并完成多平台计费关联', 'success')
    }
    showFormModal.value = false
    await fetchProducts()
  } catch (e: any) {
    emit('toast', `${isEditMode.value ? '修改' : '创建'}失败: ` + (e.data?.statusMessage || e.message), 'error')
  } finally { saving.value = false }
}

// ── 上下架 ──────────────────────────────────────────
async function toggleShelving(product: Product) {
  const next = !product.is_active
  try {
    await $fetch(`/api/admin/products/${product.id}`, { method: 'PATCH', body: { isActive: next } })
    product.is_active = next
    emit('toast', next ? `商品「${product.name}」已上架在售` : `商品「${product.name}」已下架暂存`, 'success')
  } catch (e: any) { emit('toast', '切换状态失败: ' + (e.data?.statusMessage || e.message), 'error') }
}

// ── 批量操作 ──────────────────────────────────────────
async function batchToggle(active: boolean) {
  if (!selectedIds.value.size) return
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map(id => $fetch(`/api/admin/products/${id}`, { method: 'PATCH', body: { isActive: active } })))
    emit('toast', `已批量${active ? '上架' : '下架'} ${ids.length} 个商品`, 'success')
    selectedIds.value.clear(); selectedIds.value = new Set()
    await fetchProducts()
  } catch (e: any) { emit('toast', '批量操作失败: ' + (e.data?.statusMessage || e.message), 'error') }
}

async function batchDelete() {
  if (!selectedIds.value.size) return
  if (!await confirmDialog.value.show(`确定删除选中的 ${selectedIds.value.size} 个商品吗？`, { title: '批量删除商品', confirmText: '确认删除', icon: 'i-lucide-trash-2' })) return
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map(id => $fetch(`/api/admin/products/${id}`, { method: 'DELETE' })))
    emit('toast', `已删除 ${ids.length} 个商品`, 'success')
    selectedIds.value.clear(); selectedIds.value = new Set()
    await fetchProducts()
  } catch (e: any) { emit('toast', '批量删除失败: ' + (e.data?.statusMessage || e.message), 'error') }
}

// ── 删除单个 ──────────────────────────────────────────
async function handleDelete(product: Product) {
  if (!await confirmDialog.value.show(`确定删除商品「${product.name}」吗？`, { title: '删除商品', detail: '有历史订单时将仅归档，不会真正删除数据。', confirmText: '确认删除', icon: 'i-lucide-trash-2' })) return
  deleteLoading.value[product.id] = true
  try {
    const res = await $fetch<any>(`/api/admin/products/${product.id}`, { method: 'DELETE' })
    emit('toast', res?.message || '商品已删除/归档', 'success')
    await fetchProducts()
  } catch (e: any) { emit('toast', '删除失败: ' + (e.data?.statusMessage || e.message), 'error') }
  finally { deleteLoading.value[product.id] = false }
}

// ── 同步 Stripe ────────────────────────────────────────
async function syncStripe() {
  syncLoading.value = true
  try {
    const res = await $fetch<any>('/api/admin/products/sync-stripe', { method: 'POST' })
    const r = res?.data || res
    emit('toast', `Stripe 同步完成: 新增 ${r.created || 0}, 更新 ${r.updated || 0}, 跳过 ${r.skipped || 0}, 下架 ${r.deactivated || 0}`, 'success')
    await fetchProducts()
  } catch (e: any) { emit('toast', 'Stripe 同步失败: ' + (e.data?.statusMessage || e.message), 'error') }
  finally { syncLoading.value = false }
}

// ── 排序切换 ──────────────────────────────────────────
function toggleSort(field: typeof sortBy.value) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}
const sortIcon = (field: string) => sortBy.value === field ? (sortOrder.value === 'desc' ? '↓' : '↑') : ''

const platforms = ['stripe', 'paypal', 'apple_iap', 'google_pay', 'alipay', 'wechat'] as const
const platformLabel = (p: string) => p === 'apple_iap' ? 'Apple' : p === 'google_pay' ? 'GPay' : p.charAt(0).toUpperCase() + p.slice(1)
const hasPaymentBinding = (p: Product) => platforms.some(pl => p.payment_meta?.[pl])
</script>

<template>
  <div class="space-y-4 sm:space-y-5 animate-fade-in text-white">
    <!-- 顶栏 -->
    <div class="flex justify-between items-start flex-wrap gap-3">
      <div>
        <h1 class="text-[22px] sm:text-[26px] md:text-[28px] font-bold text-white tracking-tight">商品与定价策略</h1>
        <p class="text-white/40 text-xs mt-0.5">创建商品、映射支付 Price ID 并动态管理其上架在售状态</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="syncStripe" :disabled="syncLoading || loading"
          class="text-xs bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/25 text-indigo-400 font-semibold px-4 py-2 rounded-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
          <span :class="{ 'animate-spin': syncLoading }"><span class="i-lucide-refresh-cw text-xs" /></span>
          {{ syncLoading ? '同步中...' : '同步 Stripe' }}
        </button>
        <button @click="openCreate"
          class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1">
          <span class="i-lucide-plus" /> 新建商品
        </button>
      </div>
    </div>

    <!-- 搜索 + 分类 + 排序 -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3">
      <div class="relative w-full sm:w-auto sm:flex-1 sm:min-w-[180px] sm:max-w-sm">
        <span class="i-lucide-search absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-xs" />
        <input v-model="searchQuery" type="text" placeholder="搜索商品名称..."
          class="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/40" />
      </div>
      <div class="overflow-x-auto max-w-full">
        <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-0.5 rounded-lg whitespace-nowrap">
          <button v-for="c in categoryOptions" :key="c.key" @click="categoryFilter = c.key"
            class="text-[10px] font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer border-0 whitespace-nowrap"
            :class="categoryFilter === c.key ? 'bg-white/10 text-white' : 'bg-transparent text-white/50 hover:text-white/80'"
          >{{ c.label }}</button>
        </div>
      </div>
      <div class="hidden sm:flex items-center gap-1.5 text-[10px] text-white/40">
        <span>排序:</span>
        <button v-for="s in ([['created_at','创建时间'],['price','价格'],['name','名称'],['updated_at','更新时间']] as const)" :key="s[0]"
          @click="toggleSort(s[0])"
          class="px-2 py-1 rounded border transition-all cursor-pointer"
          :class="sortBy === s[0] ? 'bg-white/10 text-white border-white/15' : 'bg-transparent border-white/[0.06] text-white/40 hover:text-white/70'"
        >{{ s[1] }} {{ sortIcon(s[0]) }}</button>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
      <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="i-lucide-package text-[11px] text-blue-400/60" />
          <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">商品总量</span>
        </div>
        <span class="text-[24px] font-bold tracking-tight text-white font-mono leading-none">{{ productsTotal }}</span>
      </div>
      <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="i-lucide-check-circle text-[11px] text-emerald-400/60" />
          <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">在售商品</span>
        </div>
        <span class="text-[24px] font-bold tracking-tight text-[#30d158] font-mono leading-none">{{ products.filter(p => p.is_active !== false).length }}</span>
      </div>
      <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hidden sm:block">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="i-lucide-trending-up text-[11px] text-indigo-400/60" />
          <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">平台均价</span>
        </div>
        <span class="text-[24px] font-bold tracking-tight text-indigo-400 font-mono leading-none">
          ${{ products.length ? (products.reduce((s, p) => s + (Number(p.price) || 0), 0) / products.length).toFixed(2) : '0.00' }}
        </span>
      </div>
    </div>

    <!-- 商品列表 -->
    <div class="bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden">
      <div class="overflow-x-auto overflow-y-auto max-h-[42vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[9px] bg-[#0d0d18]/95 backdrop-blur-sm">
              <th class="px-3 py-2.5 md:px-4 md:py-3 w-8"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="rounded accent-indigo-500 cursor-pointer" /></th>
              <th class="px-3 py-2.5 md:px-4 md:py-3 font-semibold font-mono">商品</th>
              <th class="px-3 py-2.5 md:px-4 md:py-3 font-semibold font-mono hidden md:table-cell">分类</th>
              <th class="px-3 py-2.5 md:px-4 md:py-3 font-semibold font-mono cursor-pointer" @click="toggleSort('price')">价格 {{ sortIcon('price') }}</th>
              <th class="px-3 py-2.5 md:px-4 md:py-3 font-semibold font-mono hidden lg:table-cell">计费关联</th>
              <th class="px-3 py-2.5 md:px-4 md:py-3 font-semibold font-mono text-center">状态</th>
              <th class="px-3 py-2.5 md:px-4 md:py-3 font-semibold font-mono text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="p in products" :key="p.id" class="hover:bg-white/[0.015] transition-colors" :class="{ 'bg-indigo-500/[0.03]': selectedIds.has(p.id) }">
              <td class="px-3 py-2.5 md:px-4 md:py-3"><input type="checkbox" :checked="selectedIds.has(p.id)" @change="toggleSelect(p.id)" class="rounded accent-indigo-500 cursor-pointer" /></td>
              <td class="px-3 py-2.5 md:px-4 md:py-3">
                <div class="flex items-center gap-3">
                  <div v-if="p.image_url" class="w-9 h-9 rounded-lg bg-white/5 border border-white/[0.06] overflow-hidden flex-shrink-0">
                    <img :src="p.image_url" :alt="p.name" class="w-full h-full object-cover" />
                  </div>
                  <div v-else class="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <span class="i-lucide-package text-white/15 text-sm" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-white/95 font-medium text-sm truncate max-w-[200px]">{{ p.name }}</div>
                    <div v-if="p.description" class="text-white/25 text-[10px] truncate max-w-[200px] mt-0.5">{{ p.description }}</div>
                    <div class="text-white/15 text-[9px] font-mono mt-0.5">{{ String(p.id).slice(0, 8) }}</div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-2.5 md:px-4 md:py-3 text-white/50 font-mono text-xs hidden md:table-cell">{{ categoryLabel[p.category] || '订阅制' }}</td>
              <td class="px-3 py-2.5 md:px-4 md:py-3">
                <div class="text-[#30d158] font-mono font-semibold">${{ Number(p.price || 0).toFixed(2) }}</div>
                <div v-if="p.pricing?.compare_at_price" class="text-white/20 text-[10px] font-mono line-through">${{ Number(p.pricing.compare_at_price).toFixed(2) }}</div>
                <div v-if="p.pricing?.billing_interval" class="text-white/20 text-[9px]">{{ p.pricing.billing_interval === 'one_time' ? '一次性' : p.pricing.billing_interval === 'month' ? '月付' : p.pricing.billing_interval === 'year' ? '年付' : p.pricing.billing_interval }}</div>
              </td>
              <td class="px-3 py-2.5 md:px-4 md:py-3 hidden lg:table-cell">
                <div class="space-y-0.5 text-[10px] font-mono">
                  <div v-for="platform in platforms" :key="platform">
                    <div v-if="p.payment_meta?.[platform]" class="flex items-center gap-1.5">
                      <span class="px-1.5 py-0.5 rounded text-[8px] uppercase font-bold"
                        :class="platform === 'stripe' ? 'bg-indigo-500/10 text-indigo-400' : platform === 'paypal' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/[0.06] text-white/40'"
                      >{{ platformLabel(platform) }}</span>
                      <span class="text-white/50 truncate max-w-[100px]">{{ p.payment_meta[platform].priceId || p.payment_meta[platform].planId || p.payment_meta[platform].productId || p.payment_meta[platform].productCode || '已绑定' }}</span>
                    </div>
                  </div>
                  <span v-if="!hasPaymentBinding(p)" class="text-white/20">无计费绑定</span>
                </div>
              </td>
              <td class="px-3 py-2.5 md:px-4 md:py-3 text-center">
                <button @click="toggleShelving(p)"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer active:scale-95"
                  :class="p.is_active !== false ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20' : 'bg-white/5 text-white/40 border-white/10'"
                >{{ p.is_active !== false ? '在售' : '下架' }}</button>
              </td>
              <td class="px-3 py-2.5 md:px-4 md:py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openEdit(p)" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">修改</button>
                  <button @click="handleDelete(p)" :disabled="deleteLoading[p.id]" class="text-xs text-[#ff453a]/70 hover:text-[#ff453a] font-semibold cursor-pointer disabled:opacity-40">{{ deleteLoading[p.id] ? '...' : '删除' }}</button>
                </div>
              </td>
            </tr>
            <tr v-if="!products.length && !loading">
              <td colspan="7" class="py-12 text-center text-xs text-white/20 font-light">
                {{ searchQuery ? `未找到匹配「${searchQuery}」的商品` : '暂无商品，请点击"新建商品"或"同步 Stripe"。' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="productsTotal > 0" class="flex items-center justify-between px-4 py-2.5 bg-white/[0.01] rounded-lg border border-white/[0.04]">
      <div class="text-[11px] text-white/30 font-mono">共 {{ productsTotal }} 条 · 第 {{ currentPage }}/{{ totalPages }} 页</div>
      <div class="flex items-center gap-2">
        <button @click="handlePageChange(currentPage - 1)" :disabled="currentPage <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer">上一页</button>
        <button @click="handlePageChange(currentPage + 1)" :disabled="currentPage >= totalPages" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer">下一页</button>
      </div>
    </div>

    <!-- 批量操作浮动栏 -->
    <Transition name="batch-bar">
      <div v-if="selectedCount > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-5 py-3 bg-[#1a1a2e]/95 backdrop-blur-md border border-indigo-500/25 rounded-xl shadow-[0_8px_32px_rgba(99,102,241,0.15)]">
        <div class="flex items-center gap-2 pr-3 border-r border-white/10">
          <span class="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-300">{{ selectedCount }}</span>
          <span class="text-xs text-white/70 font-medium whitespace-nowrap">项已选</span>
        </div>
        <button @click="batchToggle(true)" class="text-[11px] bg-[#30d158]/15 hover:bg-[#30d158]/25 text-[#30d158] border border-[#30d158]/25 px-3.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-all active:scale-95 whitespace-nowrap">上架</button>
        <button @click="batchToggle(false)" class="text-[11px] bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 px-3.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-all active:scale-95 whitespace-nowrap">下架</button>
        <button @click="batchDelete" class="text-[11px] bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/20 px-3.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-all active:scale-95 whitespace-nowrap">删除</button>
        <div class="w-px h-4 bg-white/10 mx-0.5" />
        <button @click="selectedIds.clear(); selectedIds = new Set()" class="text-[11px] text-white/40 hover:text-white/70 cursor-pointer transition-colors px-2 py-1.5 whitespace-nowrap">取消</button>
      </div>
    </Transition>

    <!-- ── 商品表单弹窗（创建/编辑共享）── -->
    <Transition name="modal">
      <div v-if="showFormModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div class="w-[calc(100%-2rem)] sm:w-full max-w-lg max-w-[95vw] bg-[#0e0e12] border border-white/[0.08] rounded-xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-bold text-white mb-5">{{ isEditMode ? '修改商品定价策略' : '新建平台销售商品' }}</h3>
          <div class="space-y-4">
            <!-- 基本信息 -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">商品名称</label>
              <input type="text" v-model="form.name" placeholder="例如：HEHE Pro 会员包"
                class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">定价 (USD)</label>
                <input type="number" step="0.01" v-model="form.price"
                  class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">划线价（可选）</label>
                <input type="number" step="0.01" v-model="form.compareAtPrice" placeholder="29.90"
                  class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">商品描述</label>
              <textarea v-model="form.description" rows="2" placeholder="简短描述商品特性..."
                class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 resize-none" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">商品图片</label>
              <div class="flex items-center gap-3">
                <!-- 图片预览 -->
                <div v-if="form.image_url" class="relative w-14 h-14 rounded-lg border border-white/[0.08] overflow-hidden flex-shrink-0">
                  <img :src="form.image_url" class="w-full h-full object-cover" />
                  <button
                    type="button"
                    @click="form.image_url = ''"
                    class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff453a] text-white flex items-center justify-center text-[8px] cursor-pointer"
                  ><span class="i-lucide-x" /></button>
                </div>
                <!-- 输入框 + 选取按钮 -->
                <div class="flex-1 flex items-center gap-2">
                  <input type="url" v-model="form.image_url" placeholder="https://... 或从媒体库选取"
                    class="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50" />
                  <button
                    type="button"
                    @click="showMediaPicker = true"
                    class="flex-shrink-0 bg-white/[0.05] hover:bg-white/[0.10] border border-dashed border-white/[0.15] hover:border-indigo-500/40 rounded-lg px-3 py-2.5 text-xs text-white/50 hover:text-indigo-400 transition-all cursor-pointer flex items-center gap-1.5"
                  ><span class="i-lucide-image text-[13px]" /> 媒体库</button>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div class="space-y-1.5">
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">业务分类</label>
                <select v-model="form.category" class="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                  <option value="subscription">订阅制</option><option value="one_time">一次性</option><option value="addon">增值</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">计费模式</label>
                <select v-model="form.mode" class="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                  <option value="subscription">周期订阅</option><option value="payment">一次性付款</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">试用期(天)</label>
                <input type="number" min="0" max="365" v-model="form.trialDays"
                  class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
              </div>
            </div>

            <!-- 平台标识配置 -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">平台标识配置</label>
              <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-0.5 rounded-lg flex-wrap gap-0.5">
                <button v-for="p in platforms" :key="p" @click="activePlatform = p"
                  class="text-[9px] font-semibold px-2 py-1 rounded-md transition-all cursor-pointer border-0"
                  :class="activePlatform === p ? 'bg-indigo-500/20 text-indigo-400' : 'bg-transparent text-white/40 hover:text-white/70'"
                >{{ platformLabel(p) }}</button>
              </div>
              <input v-if="activePlatform === 'stripe'" type="text" v-model="form.stripePriceId" placeholder="Stripe Price ID: price_1Pxxx..." class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50" />
              <input v-if="activePlatform === 'paypal'" type="text" v-model="form.paypalPlanId" placeholder="PayPal Plan ID: P-xxx..." class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50" />
              <input v-if="activePlatform === 'apple_iap'" type="text" v-model="form.appleProductId" placeholder="Apple Product ID: com.hehe.premium" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50" />
              <input v-if="activePlatform === 'google_pay'" type="text" v-model="form.googlePayProductId" placeholder="Google Pay Product ID" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50" />
              <input v-if="activePlatform === 'alipay'" type="text" v-model="form.alipayProductCode" placeholder="支付宝产品码" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50" />
              <input v-if="activePlatform === 'wechat'" type="text" v-model="form.wechatPlanId" placeholder="微信支付计划 ID" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50" />
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3 border-t border-white/[0.06] pt-4">
            <button @click="showFormModal = false" class="text-xs bg-white/5 hover:bg-white/10 text-white/70 font-semibold px-5 py-2.5 rounded-lg transition-all cursor-pointer">取消</button>
            <button @click="handleSaveProduct" :disabled="saving"
              class="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer">
              {{ saving ? '保存中...' : (isEditMode ? '保存修改' : '确认创建') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
    <AdminConfirmDialog ref="confirmDialog" />

    <!-- 媒体库选取器弹窗 -->
    <Teleport to="body">
      <div v-if="showMediaPicker" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" @click.self="showMediaPicker = false">
        <div class="bg-[#0a0a0c]/95 border border-white/[0.08] rounded-2xl w-[90vw] max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
          <div class="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
            <span class="text-xs font-semibold text-white/80 uppercase tracking-widest font-mono">从媒体库选取商品图片</span>
            <button @click="showMediaPicker = false" class="text-white/50 hover:text-white transition-all cursor-pointer text-xs">✕ 关闭</button>
          </div>
          <div class="flex-1 overflow-y-auto p-5">
            <AdminMedia :picker-mode="true" @selected="handleMediaSelected" @close="showMediaPicker = false" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16,1,0.3,1); }
.modal-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.97); }
.batch-bar-enter-active { transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.batch-bar-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.batch-bar-enter-from, .batch-bar-leave-to { opacity: 0; transform: translate(-50%, 12px) scale(0.95); }
.batch-bar-enter-to, .batch-bar-leave-from { transform: translate(-50%, 0) scale(1); }
</style>
