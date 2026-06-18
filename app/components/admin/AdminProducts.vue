<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Product {
  id: string
  name: string
  price: number
  is_active: boolean
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

// 新建商品表单
const createForm = ref({
  name: '',
  price: 0,
  mode: 'subscription' as 'payment' | 'subscription',
  stripePriceId: ''
})

// 编辑商品表单
const editingProduct = ref<Product | null>(null)
const editForm = ref({
  name: '',
  price: 0,
  mode: 'subscription' as 'payment' | 'subscription',
  stripePriceId: ''
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
  createForm.value = {
    name: '',
    price: 19.90,
    mode: 'subscription',
    stripePriceId: ''
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
        paymentMeta: {
          stripe: {
            priceId: createForm.value.stripePriceId || undefined,
            mode: createForm.value.mode
          }
        }
      }
    })
    emit('toast', '商品创建成功并完成计费关联', 'success')
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
  editForm.value = {
    name: product.name,
    price: product.price,
    mode: (product.payment_meta?.stripe?.mode || 'subscription') as 'payment' | 'subscription',
    stripePriceId: product.payment_meta?.stripe?.priceId || ''
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
        paymentMeta: {
          stripe: {
            ...editingProduct.value.payment_meta?.stripe,
            priceId: editForm.value.stripePriceId || undefined,
            mode: editForm.value.mode
          }
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

    <!-- KPI 卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white/[0.03] border border-white/[0.05] p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-blue-500/5 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1 font-mono">商品总量</div>
        <div class="text-3xl font-bold tracking-tight text-white font-mono">{{ products.length }}</div>
        <div class="text-xs text-white/30 mt-2">包含本地商品与已同步的渠道商品</div>
      </div>
      <div class="bg-white/[0.03] border border-white/[0.05] p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1 font-mono">在售商品</div>
        <div class="text-3xl font-bold tracking-tight text-[#30d158] font-mono">{{ products.filter(p => p.is_active !== false).length }}</div>
        <div class="text-xs text-white/30 mt-2">允许前台及 H5 下单付款的商品</div>
      </div>
      <div class="bg-white/[0.03] border border-white/[0.05] p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-purple-500/5 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1 font-mono">平台均价</div>
        <div class="text-3xl font-bold tracking-tight text-indigo-400 font-mono">
          ${{ products.length ? (products.reduce((s, p) => s + (Number(p.price) || 0), 0) / products.length).toFixed(2) : '0.00' }}
        </div>
        <div class="text-xs text-white/30 mt-2">在售产品均价</div>
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
              <th class="px-6 py-4 font-semibold font-mono">价格 (USD)</th>
              <th class="px-6 py-4 font-semibold font-mono">计费关联</th>
              <th class="px-6 py-4 font-semibold font-mono text-center">状态</th>
              <th class="px-6 py-4 font-semibold font-mono text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="p in products" :key="p.id" class="hover:bg-white/[0.01] transition-colors">
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ String(p.id).slice(0, 8) }}</td>
              <td class="px-6 py-5 text-white/95 font-medium">{{ p.name }}</td>
              <td class="px-6 py-5 text-[#30d158] font-mono font-semibold">${{ Number(p.price || 0).toFixed(2) }}</td>
              <td class="px-6 py-5">
                <div v-if="p.payment_meta?.stripe" class="space-y-1 text-[10px] font-mono">
                  <div class="flex items-center gap-1.5">
                    <span class="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-[8px] uppercase">Stripe</span>
                    <span class="text-white/60">{{ p.payment_meta.stripe.priceId || '未配置' }}</span>
                  </div>
                  <div class="text-white/30 capitalize pl-1">模式: {{ p.payment_meta.stripe.mode === 'subscription' ? '周期订阅' : '单次购买' }}</div>
                </div>
                <span v-else class="text-white/20 text-xs">无计费绑定</span>
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
                <button @click="openEdit(p)" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">修改</button>
              </td>
            </tr>
            <tr v-if="!products.length && !loading">
              <td colspan="6" class="py-12 text-center text-xs text-white/20 font-light">
                暂无商品，请点击“新建商品”或“同步 Stripe 商品”。
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
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Stripe Price ID</label>
              <input
                type="text"
                v-model="createForm.stripePriceId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="例如：price_1Pxxx..."
              />
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
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">计费模式</label>
              <select
                v-model="editForm.mode"
                class="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="payment">一次性付款 (One-time)</option>
                <option value="subscription">周期性计费订阅 (Subscription)</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Stripe Price ID</label>
              <input
                type="text"
                v-model="editForm.stripePriceId"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
              />
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
