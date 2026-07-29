<script setup lang="ts">
import AdminConfirmDialog from './AdminConfirmDialog.vue'

defineProps<{ isLoading: boolean }>()
const emit = defineEmits<{ refresh: []; toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

const packages = ref<any[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingItem = ref<any>(null)
const form = reactive({ name: '', coins_amount: 500, bonus_coins: 0, price: 4.99, currency: 'USD', is_active: true, sort_order: 1 })
const confirmDialog = ref<InstanceType<typeof AdminConfirmDialog> | null>(null)

async function fetchData() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/admin/coin-packages')
    packages.value = res.data?.items || []
  } catch (e: any) { emit('toast', 'Failed to load packages: ' + (e.message || 'Error'), 'error') }
  finally { loading.value = false }
}

function openCreate() {
  editingItem.value = null
  form.name = ''; form.coins_amount = 500; form.bonus_coins = 0; form.price = 4.99; form.currency = 'USD'; form.is_active = true; form.sort_order = packages.value.length + 1
  showModal.value = true
}

function openEdit(pkg: any) {
  editingItem.value = pkg
  form.name = pkg.name; form.coins_amount = pkg.coins_amount; form.bonus_coins = pkg.bonus_coins || 0
  form.price = pkg.price; form.currency = pkg.currency || 'USD'; form.is_active = pkg.is_active; form.sort_order = pkg.sort_order
  showModal.value = true
}

async function save() {
  try {
    const body = { ...form }
    if (editingItem.value) {
      await $fetch(`/api/admin/coin-packages/${editingItem.value.id}`, { method: 'PATCH', body })
      emit('toast', 'Package updated', 'success')
    } else {
      await $fetch('/api/admin/coin-packages', { method: 'POST', body })
      emit('toast', 'Package created', 'success')
    }
    showModal.value = false
    await fetchData()
  } catch (e: any) { emit('toast', 'Save failed: ' + (e.message || 'Error'), 'error') }
}

async function toggleActive(pkg: any) {
  try {
    await $fetch(`/api/admin/coin-packages/${pkg.id}`, { method: 'PATCH', body: { is_active: !pkg.is_active } })
    await fetchData()
    emit('toast', pkg.is_active ? 'Deactivated' : 'Activated', 'success')
  } catch (e: any) { emit('toast', 'Toggle failed: ' + (e.message || 'Error'), 'error') }
}

async function deletePackage(pkg: any) {
  const ok = await confirmDialog.value?.show(`Delete "${pkg.name}"?`, { confirmLabel: 'Delete', confirmClass: 'btn-danger' })
  if (!ok) return
  try {
    await $fetch(`/api/admin/coin-packages/${pkg.id}`, { method: 'DELETE' })
    emit('toast', 'Package deleted', 'success')
    await fetchData()
  } catch (e: any) { emit('toast', 'Delete failed: ' + (e.message || 'Error'), 'error') }
}

const statusBadge = (active: boolean) => active ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20' : 'bg-white/[0.04] text-white/30 border-white/[0.06]'

onMounted(() => fetchData())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-white/90 text-lg font-semibold">金币套餐管理</h2>
      <button @click="openCreate" class="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition">+ 新建套餐</button>
    </div>

    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#0d0d18]/95 backdrop-blur-sm">
            <tr>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">套餐名</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">金币</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">赠送</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">价格</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">状态</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">排序</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pkg in packages" :key="pkg.id" class="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
              <td class="px-5 py-3 text-white/80 font-medium">{{ pkg.name }}</td>
              <td class="px-5 py-3 text-yellow-400 font-mono">{{ pkg.coins_amount?.toLocaleString() }}</td>
              <td class="px-5 py-3 text-green-400 font-mono">{{ pkg.bonus_coins ? '+' + pkg.bonus_coins.toLocaleString() : '—' }}</td>
              <td class="px-5 py-3 text-white/70 font-mono">${{ pkg.price }}</td>
              <td class="px-5 py-3">
                <span class="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border" :class="statusBadge(pkg.is_active)">
                  {{ pkg.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-5 py-3 text-white/50">{{ pkg.sort_order }}</td>
              <td class="px-5 py-3">
                <div class="flex gap-2">
                  <button @click="openEdit(pkg)" class="text-xs text-indigo-400 hover:text-indigo-300 transition">编辑</button>
                  <button @click="toggleActive(pkg)" class="text-xs text-yellow-400 hover:text-yellow-300 transition">{{ pkg.is_active ? '停用' : '启用' }}</button>
                  <button @click="deletePackage(pkg)" class="text-xs text-red-400 hover:text-red-300 transition">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-6 shadow-2xl w-full max-w-md">
          <h3 class="text-white/90 text-base font-semibold mb-4">{{ editingItem ? '编辑套餐' : '新建套餐' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">套餐名</label>
              <input v-model="form.name" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" placeholder="Starter Pack" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">金币数量</label>
                <input v-model.number="form.coins_amount" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
              </div>
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">赠送金币</label>
                <input v-model.number="form.bonus_coins" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">价格 ($)</label>
                <input v-model.number="form.price" type="number" step="0.01" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
              </div>
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">排序</label>
                <input v-model.number="form.sort_order" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.06]">
            <button @click="showModal = false" class="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 transition">取消</button>
            <button @click="save" class="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <AdminConfirmDialog ref="confirmDialog" />
  </div>
</template>
