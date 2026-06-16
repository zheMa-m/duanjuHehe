<script setup lang="ts">
interface AdSlot {
  id: string
  name: string
  position: string
  is_active: boolean
  campaign_id: string | null
  ad_provider: string
  ad_config: Record<string, any>
  sort_order: number
  created_at: string
}

const props = defineProps<{
  slots: AdSlot[] | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  create: [slot: Partial<AdSlot>]
  update: [id: string, data: Partial<AdSlot>]
  delete: [id: string]
}>()

const showForm = ref(false)
const editingSlot = ref<AdSlot | null>(null)

const form = reactive({
  name: '',
  position: 'header_banner',
  is_active: true,
  ad_provider: 'custom',
  ad_config: '{}',
  sort_order: 0,
})

const resetForm = () => {
  form.name = ''
  form.position = 'header_banner'
  form.is_active = true
  form.ad_provider = 'custom'
  form.ad_config = '{}'
  form.sort_order = 0
  editingSlot.value = null
  showForm.value = false
}

const startEdit = (slot: AdSlot) => {
  editingSlot.value = slot
  form.name = slot.name
  form.position = slot.position
  form.is_active = slot.is_active
  form.ad_provider = slot.ad_provider
  form.ad_config = JSON.stringify(slot.ad_config, null, 2)
  form.sort_order = slot.sort_order
  showForm.value = true
}

const handleSubmit = () => {
  let config: Record<string, any> = {}
  try { config = JSON.parse(form.ad_config) } catch (_e) { alert('Invalid JSON config'); return }

  const data = {
    name: form.name,
    position: form.position,
    is_active: form.is_active,
    ad_provider: form.ad_provider,
    ad_config: config,
    sort_order: form.sort_order,
  }

  if (editingSlot.value) {
    emit('update', editingSlot.value.id, data)
  } else {
    emit('create', data)
  }
  resetForm()
}

const handleDelete = (id: string) => {
  if (!confirm('Confirm delete this ad slot?')) return
  emit('delete', id)
}

const handleToggle = (slot: AdSlot) => {
  emit('update', slot.id, { is_active: !slot.is_active })
}

const positionBadge = (pos: string) => {
  const map: Record<string, string> = {
    header_banner: 'bg-blue-500/10 text-blue-400',
    footer_banner: 'bg-indigo-500/10 text-indigo-400',
    native_inline: 'bg-teal-500/10 text-teal-400',
    interstitial: 'bg-orange-500/10 text-orange-400',
  }
  return map[pos] || 'bg-white/5 text-white/40'
}
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-white tracking-tight">Ad Slot Management</h1>
        <p class="text-white/40 text-xs mt-1">Configure ad placements for H5 marketing pages — supports AdSense, Meta, and custom HTML</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="showForm = !showForm; editingSlot = null"
          class="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium px-4 py-2 rounded-full transition-all"
        >
          + New Slot
        </button>
        <button
          @click="$emit('refresh')"
          :disabled="isLoading"
          class="text-xs bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-full transition-all"
        >
          Refresh
        </button>
      </div>
    </div>

    <!-- Create/Edit Form -->
    <div v-if="showForm" class="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6 space-y-4">
      <h3 class="text-sm font-medium text-white">{{ editingSlot ? 'Edit Ad Slot' : 'New Ad Slot' }}</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-[10px] text-white/40 block mb-1">Name</label>
          <input v-model="form.name" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50" />
        </div>
        <div>
          <label class="text-[10px] text-white/40 block mb-1">Position</label>
          <select v-model="form.position" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
            <option value="header_banner">Header Banner</option>
            <option value="footer_banner">Footer Banner</option>
            <option value="native_inline">Native Inline</option>
            <option value="interstitial">Interstitial</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] text-white/40 block mb-1">Provider</label>
          <select v-model="form.ad_provider" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
            <option value="custom">Custom HTML</option>
            <option value="adsense">Google AdSense</option>
            <option value="meta">Meta Ads</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] text-white/40 block mb-1">Sort Order</label>
          <input v-model.number="form.sort_order" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" />
        </div>
      </div>
      <div>
        <label class="text-[10px] text-white/40 block mb-1">Ad Config (JSON)</label>
        <textarea v-model="form.ad_config" rows="4" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono focus:border-blue-500/50" />
      </div>
      <div class="flex gap-2">
        <button @click="handleSubmit" class="text-xs bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-full transition-all">
          {{ editingSlot ? 'Update' : 'Create' }}
        </button>
        <button @click="resetForm" class="text-xs bg-white/10 text-white/60 px-4 py-2 rounded-full transition-all hover:bg-white/15">
          Cancel
        </button>
      </div>
    </div>

    <!-- Ad Slots Table -->
    <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/5 text-white/40 uppercase tracking-wider text-[9px]">
              <th class="px-6 py-3.5 font-medium">Name</th>
              <th class="px-6 py-3.5 font-medium">Position</th>
              <th class="px-6 py-3.5 font-medium">Provider</th>
              <th class="px-6 py-3.5 font-medium">Active</th>
              <th class="px-6 py-3.5 font-medium">Sort</th>
              <th class="px-6 py-3.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="slot in slots"
              :key="slot.id"
              class="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              <td class="px-6 py-3 text-white/80">{{ slot.name }}</td>
              <td class="px-6 py-3">
                <span class="text-[9px] px-2 py-0.5 rounded-full" :class="positionBadge(slot.position)">
                  {{ slot.position }}
                </span>
              </td>
              <td class="px-6 py-3 text-white/50">{{ slot.ad_provider }}</td>
              <td class="px-6 py-3">
                <button
                  @click="handleToggle(slot)"
                  class="text-[10px] px-2 py-0.5 rounded-full border transition-all"
                  :class="slot.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/30 border-white/10'"
                >
                  {{ slot.is_active ? 'Active' : 'Disabled' }}
                </button>
              </td>
              <td class="px-6 py-3 text-white/40 font-mono">{{ slot.sort_order }}</td>
              <td class="px-6 py-3 flex gap-3">
                <button @click="startEdit(slot)" class="text-[10px] text-blue-400 hover:text-blue-300">Edit</button>
                <button @click="handleDelete(slot.id)" class="text-[10px] text-red-400 hover:text-red-300">Delete</button>
              </td>
            </tr>
            <tr v-if="!slots?.length">
              <td colspan="6" class="px-6 py-12 text-center text-white/20">No ad slots configured</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
