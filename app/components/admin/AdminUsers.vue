<script setup lang="ts">
interface UserItem {
  id: string
  email: string | null
  display_name: string
  username: string | null
  role: string
  plan_status: string
  auth_provider: string
  is_anonymous: boolean
  email_verified: boolean
  avatar_url: string | null
  phone: string | null
  device_id: string | null
  last_sign_in_at: string | null
  created_at: string | null
  updated_at: string | null
}

const props = defineProps<{
  users: UserItem[] | null
  usersTotal: number
  usersPage: number
  usersPageSize: number
  isLoading: boolean
  stats: {
    total: number
    byRole: Record<string, number>
    byPlan: Record<string, number>
    anonymousCount: number
    verifiedCount: number
  } | null
}>()

const emit = defineEmits<{
  refresh: []
  updateUser: [id: string, data: { role?: string; plan_status?: string; display_name?: string }]
  deleteUser: [id: string]
  changePage: [page: number]
  filterRole: [role: string]
  filterPlan: [plan: string]
  search: [query: string]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.usersTotal / props.usersPageSize)))
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  emit('changePage', page)
}

// 搜索防抖
let searchTimer: ReturnType<typeof setTimeout> | null = null
const searchQuery = ref('')
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    emit('search', searchQuery.value)
    emit('changePage', 1)
  }, 300)
}

// ── 筛选状态（服务端过滤，通过 emit 传给父组件） ─────────────
const activeFilter = ref<'role' | 'plan'>('role')
const roleFilter = ref('all')
const planFilter = ref('all')

const userFilterTabs = [
  { key: 'all', label: '全部用户', type: 'role' as const },
  { key: 'admin', label: '管理员', type: 'role' as const },
  { key: 'user', label: '普通用户', type: 'role' as const },
  { key: 'paid', label: '付费用户', type: 'plan' as const },
]

const isActiveTab = (tab: { key: string; type: 'role' | 'plan' }) => {
  if (tab.type === 'role') return activeFilter.value === 'role' && roleFilter.value === tab.key
  return activeFilter.value === 'plan' && planFilter.value === tab.key
}

const handleTabClick = (tab: { key: string; type: 'role' | 'plan' }) => {
  if (tab.type === 'role') {
    activeFilter.value = 'role'
    roleFilter.value = tab.key
    planFilter.value = 'all'
    emit('filterRole', tab.key)
    emit('filterPlan', 'all')
  } else {
    activeFilter.value = 'plan'
    planFilter.value = tab.key
    roleFilter.value = 'all'
    emit('filterRole', 'all')
    emit('filterPlan', tab.key)
  }
  emit('changePage', 1)
}
const filteredUsers = computed(() => {
  if (!props.users) return []
  return props.users
})

// ── 展开详情行 ────────────────────────────────────────────────
const expandedId = ref<string | null>(null)
const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

// ── 编辑弹窗 ─────────────────────────────────────────────────
const editModal = ref(false)
const editTarget = ref<UserItem | null>(null)
const editForm = reactive({
  role: '',
  plan_status: '',
  display_name: '',
})

const openEdit = (user: UserItem) => {
  editTarget.value = user
  editForm.role = user.role
  editForm.plan_status = user.plan_status
  editForm.display_name = user.display_name || ''
  editModal.value = true
}

const submitEdit = () => {
  if (!editTarget.value) return
  const changes: Record<string, any> = {}
  if (editForm.role !== editTarget.value.role) changes.role = editForm.role
  if (editForm.plan_status !== editTarget.value.plan_status) changes.plan_status = editForm.plan_status
  if (editForm.display_name !== (editTarget.value.display_name || '')) changes.display_name = editForm.display_name
  if (Object.keys(changes).length === 0) { editModal.value = false; return }
  emit('updateUser', editTarget.value.id, changes)
  editModal.value = false
}

// ── 删除确认 ─────────────────────────────────────────────────
const handleDelete = (user: UserItem) => {
  const label = user.email || user.display_name || user.id
  if (!confirm(`确定要永久删除用户「${label}」吗？\n此操作将级联清理其 Auth 账号与 Profile 数据，不可恢复。`)) return
  emit('deleteUser', user.id)
}

// ── 辅助函数 ─────────────────────────────────────────────────
const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    admin: 'bg-[#bf5af2]/10 text-[#bf5af2] border-[#bf5af2]/20',
    user: 'bg-white/5 text-white/60 border-white/10',
  }
  return map[role] || map.user
}

const planBadge = (plan: string) => {
  const map: Record<string, string> = {
    enterprise: 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20',
    pro: 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20',
    free: 'bg-white/5 text-white/50 border-white/10',
  }
  return map[plan] || map.free
}

const providerIcon = (provider: string) => {
  const map: Record<string, string> = {
    email: 'i-lucide-mail',
    google: 'i-lucide-chrome',
    facebook: 'i-lucide-facebook',
    apple: 'i-lucide-apple',
    anonymous: 'i-lucide-ghost',
  }
  return map[provider] || 'i-lucide-help-circle'
}

// ── 中文标签映射 ─────────────────────────────────────────────
const roleLabel: Record<string, string> = {
  admin: '管理员',
  user: '普通用户',
}
const planLabel: Record<string, string> = {
  free: '免费版',
  pro: '专业版',
  enterprise: '企业版',
}
const providerLabel: Record<string, string> = {
  email: '邮箱登录',
  google: 'Google',
  facebook: 'Facebook',
  apple: 'Apple',
  anonymous: '匿名登录',
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题栏 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">用户管理</h1>
        <p class="text-white/40 text-sm mt-1">管理 Supabase Auth 用户，调整角色权限与订阅套餐，审计跟踪全记录</p>
      </div>
      <button
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/[0.06] hover:bg-white/[0.10] disabled:opacity-50 text-white/70 hover:text-white/90 font-medium px-4 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 border border-white/[0.06] hover:border-white/[0.10]"
      >
        <span :class="{'animate-spin': isLoading}" class="i-lucide-refresh-cw text-[13px]" />
        刷新用户
      </button>
    </div>

    <!-- 搜索输入框 -->
    <div class="w-full max-w-md">
      <input
        type="text"
        v-model="searchQuery"
        @input="onSearchInput"
        placeholder="搜索用户邮箱或显示名称..."
        class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-all"
      />
    </div>

    <!-- 筛选胶囊（角色 + 套餐组合） -->
    <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-full shadow-[inset_0_1px_rgba(255,255,255,0.02)]">
      <button
        v-for="tab in userFilterTabs"
        :key="tab.key + tab.type"
        @click="handleTabClick(tab)"
        class="text-[10px] font-semibold px-4.5 py-2.5 rounded-full transition-all cursor-pointer focus:outline-none border-0"
        :class="isActiveTab(tab)
          ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_rgba(255,255,255,0.05)]'
          : 'bg-transparent text-white/60 hover:text-white/90'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 用户统计摘要（全局数据，来自 /api/admin/users/stats） -->
    <div v-if="stats" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div class="relative p-5 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-white/[0.08] hover:-translate-y-px group">
        <div class="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-blue-500/[0.04] blur-3xl group-hover:bg-blue-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25 block mb-1">总用户</span>
          <span class="text-[28px] font-bold text-white font-mono leading-none">{{ stats.total }}</span>
        </div>
      </div>
      <div class="relative p-5 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#bf5af2]/15 hover:-translate-y-px group">
        <div class="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-purple-500/[0.04] blur-3xl group-hover:bg-purple-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25 block mb-1">管理员</span>
          <span class="text-[28px] font-bold text-[#bf5af2] font-mono leading-none">{{ stats.byRole?.admin || 0 }}</span>
        </div>
      </div>
      <div class="relative p-5 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#30d158]/15 hover:-translate-y-px group">
        <div class="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-emerald-500/[0.04] blur-3xl group-hover:bg-emerald-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25 block mb-1">付费用户</span>
          <span class="text-[28px] font-bold text-[#30d158] font-mono leading-none">{{ (stats.byPlan?.pro || 0) + (stats.byPlan?.enterprise || 0) }}</span>
        </div>
      </div>
      <div class="relative p-5 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#ff9f0a]/15 hover:-translate-y-px group">
        <div class="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-amber-500/[0.04] blur-3xl group-hover:bg-amber-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25 block mb-1">匿名用户</span>
          <span class="text-[28px] font-bold text-[#ff9f0a] font-mono leading-none">{{ stats.anonymousCount || 0 }}</span>
        </div>
      </div>
      <div class="relative p-5 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#64d2ff]/15 hover:-translate-y-px group">
        <div class="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-sky-500/[0.04] blur-3xl group-hover:bg-sky-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25 block mb-1">已验证邮箱</span>
          <span class="text-[28px] font-bold text-[#64d2ff] font-mono leading-none">{{ stats.verifiedCount || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 用户列表表格（锁定高度 + 内部滚动） -->
    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
              <th class="px-6 py-4 font-semibold font-mono w-8"></th>
              <th class="px-6 py-4 font-semibold font-mono">用户信息</th>
              <th class="px-6 py-4 font-semibold font-mono">角色</th>
              <th class="px-6 py-4 font-semibold font-mono">套餐</th>
              <th class="px-6 py-4 font-semibold font-mono">认证方式</th>
              <th class="px-6 py-4 font-semibold font-mono">注册时间</th>
              <th class="px-6 py-4 font-semibold font-mono text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="user in filteredUsers" :key="user.id">
              <!-- 主行 -->
              <tr
                @click="toggleExpand(user.id)"
                class="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer"
              >
                <td class="px-6 py-5 text-white/30 text-xs">
                  <span :class="expandedId === user.id ? 'rotate-90' : ''" class="inline-block transition-transform duration-200">▶</span>
                </td>
                <td class="px-6 py-5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      :class="user.avatar_url ? '' : 'bg-white/10 ring-1 ring-white/20'">
                      <img v-if="user.avatar_url" :src="user.avatar_url" class="w-8 h-8 rounded-full object-cover" alt="" />
                      <span v-else :class="providerIcon(user.auth_provider)" class="text-[14px] text-white/50" />
                    </div>
                    <div class="min-w-0">
                      <div class="text-white/90 font-medium text-sm truncate">{{ user.display_name || '-' }}</div>
                      <div class="text-white/40 text-xs truncate">{{ user.email || '(匿名 / 无邮箱)' }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-5">
                  <span class="text-[10px] px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1" :class="roleBadge(user.role)">
                    <span class="w-1.2 h-1.2 rounded-full" :class="user.role === 'admin' ? 'bg-[#bf5af2]' : 'bg-white/40'"></span>
                    {{ roleLabel[user.role] || user.role }}
                  </span>
                </td>
                <td class="px-6 py-5">
                  <span class="text-[10px] px-2.5 py-0.5 rounded-full border inline-block" :class="planBadge(user.plan_status)">
                    {{ planLabel[user.plan_status] || user.plan_status }}
                  </span>
                </td>
                <td class="px-6 py-5">
                  <div class="flex items-center gap-1.5 text-white/50">
                    <span :class="providerIcon(user.auth_provider)" class="text-[14px]" />
                    <span class="text-xs">{{ providerLabel[user.auth_provider] || user.auth_provider }}</span>
                    <span v-if="user.is_anonymous" class="text-[8px] text-[#ff9f0a] ml-1">(匿名)</span>
                  </div>
                </td>
                <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-' }}</td>
                <td class="px-6 py-5 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-2">
                    <button
                      @click="openEdit(user)"
                      class="text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                    >
                      编辑
                    </button>
                    <button
                      @click="handleDelete(user)"
                      class="text-[11px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-4 py-2 rounded-full border border-[#ff453a]/20 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
              <!-- 展开详情 -->
              <tr v-if="expandedId === user.id">
                <td colspan="7" class="px-6 py-0">
                  <div class="bg-white/[0.02] rounded-xl p-5 my-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs shadow-lg shadow-black/10">
                    <div>
                      <div class="text-white/30 text-[10px] uppercase tracking-widest font-mono mb-1">用户 ID</div>
                      <div class="text-white/70 font-mono break-all">{{ user.id }}</div>
                    </div>
                    <div>
                      <div class="text-white/30 text-[10px] uppercase tracking-widest font-mono mb-1">用户名</div>
                      <div class="text-white/70">{{ user.username || '-' }}</div>
                    </div>
                    <div>
                      <div class="text-white/30 text-[10px] uppercase tracking-widest font-mono mb-1">手机号</div>
                      <div class="text-white/70">{{ user.phone || '-' }}</div>
                    </div>
                    <div>
                      <div class="text-white/30 text-[10px] uppercase tracking-widest font-mono mb-1">设备 ID</div>
                      <div class="text-white/70 font-mono break-all">{{ user.device_id || '-' }}</div>
                    </div>
                    <div>
                      <div class="text-white/30 text-[10px] uppercase tracking-widest font-mono mb-1">邮箱验证</div>
                      <div :class="user.email_verified ? 'text-[#30d158]' : 'text-[#ff9f0a]'">
                        <span v-if="user.email_verified" class="inline-flex items-center gap-1"><span class="i-lucide-check-circle text-[12px]" />已验证</span>
                        <span v-else class="inline-flex items-center gap-1"><span class="i-lucide-x-circle text-[12px]" />未验证</span>
                      </div>
                    </div>
                    <div>
                      <div class="text-white/30 text-[10px] uppercase tracking-widest font-mono mb-1">最后登录</div>
                      <div class="text-white/70">{{ user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '-' }}</div>
                    </div>
                    <div>
                      <div class="text-white/30 text-[10px] uppercase tracking-widest font-mono mb-1">最后更新</div>
                      <div class="text-white/70">{{ user.updated_at ? new Date(user.updated_at).toLocaleString() : '-' }}</div>
                    </div>
                    <div>
                      <div class="text-white/30 text-[10px] uppercase tracking-widest font-mono mb-1">匿名账号</div>
                      <div :class="user.is_anonymous ? 'text-[#ff9f0a]' : 'text-white/50'">
                        {{ user.is_anonymous ? '是' : '否' }}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!filteredUsers.length">
              <td colspan="7" class="py-12 text-center text-xs text-white/25 font-light">
                暂无符合条件的用户记录
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页控制栏 -->
    <div v-if="usersTotal > 0" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div class="text-[11px] text-white/30 font-mono">
        共 {{ usersTotal }} 条 · 第 {{ usersPage }}/{{ totalPages }} 页
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="handlePageChange(usersPage - 1)"
          :disabled="usersPage <= 1"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
        >上一页</button>
        <button
          @click="handlePageChange(usersPage + 1)"
          :disabled="usersPage >= totalPages"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
        >下一页</button>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <div v-if="editModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="editModal = false">
        <div class="bg-[#12121a] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] w-full max-w-md p-7 space-y-5 animate-fade-in">
          <div class="flex justify-between items-center">
            <h2 class="text-white text-base font-semibold tracking-wide">编辑用户信息</h2>
            <button @click="editModal = false" class="text-white/40 hover:text-white text-lg leading-none cursor-pointer bg-transparent border-0">×</button>
          </div>

          <div v-if="editTarget" class="text-xs text-white/30 font-mono break-all bg-white/[0.02] rounded-lg px-3 py-2">
            ID: {{ editTarget.id }}
          </div>

          <form @submit.prevent="submitEdit" class="space-y-4">
            <!-- 显示名称 -->
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">显示名称</label>
              <input
                v-model="editForm.display_name"
                type="text"
                maxlength="100"
                class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                placeholder="输入显示名称..."
              />
            </div>

            <!-- 角色 -->
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">角色</label>
              <div class="flex gap-2">
                <button
                  v-for="r in ['user', 'admin']"
                  :key="r"
                  type="button"
                  @click="editForm.role = r"
                  class="flex-1 text-xs py-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none"
                  :class="editForm.role === r
                    ? 'bg-[#bf5af2]/10 text-[#bf5af2] border-[#bf5af2]/30'
                    : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.05]'"
                >
                  {{ r === 'admin' ? '管理员' : '普通用户' }}
                </button>
              </div>
            </div>

            <!-- 套餐 -->
            <div>
              <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono mb-1.5">套餐状态</label>
              <div class="flex gap-2">
                <button
                  v-for="p in ['free', 'pro', 'enterprise']"
                  :key="p"
                  type="button"
                  @click="editForm.plan_status = p"
                  class="flex-1 text-xs py-2.5 rounded-xl border transition-all cursor-pointer focus:outline-none"
                  :class="editForm.plan_status === p
                    ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/30'
                    : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.05]'"
                >
                  {{ planLabel[p] || p }}
                </button>
              </div>
            </div>

            <!-- 按钮组 -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="editModal = false"
                class="flex-1 text-sm bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-xl border border-white/[0.08] transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                class="flex-1 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
              >
                保存修改
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
