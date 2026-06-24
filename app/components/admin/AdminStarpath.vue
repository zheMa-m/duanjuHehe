<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useCampaignPreviewUrl } from '~/composables/useCampaignPreviewUrl'

const { href: starpathPreviewHref } = useCampaignPreviewUrl('starpath')

// ── 状态 ──
const activeTab = ref('overview')
const page = ref(1)
const search = ref('')
const statusFilter = ref('')
const isLoading = ref(false)

// ── Tab 定义 ──
const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'answers', label: '问卷答案' },
  { key: 'reports', label: 'AI 报告' },
  { key: 'emails', label: '邮箱留资' },
]

const statusLabels: Record<string, string> = {
  started: '已开始', in_progress: '进行中', completed: '已完成', abandoned: '已放弃',
  pending: '待生成', generating: '生成中', failed: '失败',
}

// ── 概览数据 ──
const { data: overviewRes, refresh: refreshOverview } = useFetch<any>('/api/admin/starpath/overview', { lazy: true, immediate: false })

// ── 问卷答案 ──
const { data: answersRes, refresh: refreshAnswers } = useFetch<any>('/api/admin/starpath/answers', {
  query: computed(() => ({ page: page.value, pageSize: 20, search: search.value || undefined, status: statusFilter.value || undefined })),
  lazy: true, immediate: false,
})

// ── AI 报告 ──
const { data: reportsRes, refresh: refreshReports } = useFetch<any>('/api/admin/starpath/reports', {
  query: computed(() => ({ page: page.value, pageSize: 20, status: statusFilter.value || undefined })),
  lazy: true, immediate: false,
})

// ── 邮箱留资 ──
const { data: emailsRes, refresh: refreshEmails } = useFetch<any>('/api/admin/starpath/emails', {
  query: computed(() => ({ page: page.value, pageSize: 20, search: search.value || undefined })),
  lazy: true, immediate: false,
})

// ── Tab 切换 ──
watch(activeTab, (tab) => {
  page.value = 1
  search.value = ''
  statusFilter.value = ''
  if (tab === 'overview') refreshOverview()
  else if (tab === 'answers') refreshAnswers()
  else if (tab === 'reports') refreshReports()
  else if (tab === 'emails') refreshEmails()
}, { immediate: true })

// ── 分页 ──
function onPageChange(newPage: number) {
  page.value = newPage
  if (activeTab.value === 'answers') refreshAnswers()
  else if (activeTab.value === 'reports') refreshReports()
  else if (activeTab.value === 'emails') refreshEmails()
}

function onSearch() {
  page.value = 1
  if (activeTab.value === 'answers') refreshAnswers()
  else if (activeTab.value === 'emails') refreshEmails()
  else if (activeTab.value === 'reports') refreshReports()
}

// ── 详情弹窗（问卷答案） ──
const detailModal = ref(false)
const detailData = ref<any>(null)
const detailLoading = ref(false)

async function openAnswerDetail(sessionId: string) {
  detailModal.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    const res = await $fetch(`/api/admin/starpath/answers/${sessionId}`)
    detailData.value = res
  } catch (e: any) {
    console.error('Failed to load session detail:', e)
  } finally {
    detailLoading.value = false
  }
}

// ── 报告触发生成 ──
const triggeringId = ref<string | null>(null)
async function triggerReport(sessionId: string) {
  triggeringId.value = sessionId
  try {
    await $fetch('/api/admin/starpath/reports/trigger', {
      method: 'POST',
      body: { sessionId },
    })
    refreshReports()
  } catch (e: any) {
    console.error('Failed to trigger report:', e)
  } finally {
    triggeringId.value = null
  }
}

// ── 导出 ──
const exportingType = ref<string | null>(null)
async function exportCSV(type: 'answers' | 'emails') {
  exportingType.value = type
  try {
    const csv = await $fetch<string>(`/api/admin/starpath/export?type=${type}`)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `starpath_${type}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (e: any) {
    console.error('Export failed:', e)
  } finally {
    exportingType.value = null
  }
}

// ── 刷新 ──
async function handleRefresh() {
  isLoading.value = true
  try {
    if (activeTab.value === 'overview') await refreshOverview()
    else if (activeTab.value === 'answers') await refreshAnswers()
    else if (activeTab.value === 'reports') await refreshReports()
    else if (activeTab.value === 'emails') await refreshEmails()
  } finally {
    isLoading.value = false
  }
}

defineExpose({ refresh: handleRefresh })
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">智能问卷管理</h1>
        <p class="text-white/40 text-sm mt-1">智能推荐问卷链路：问卷数据、AI 报告、邮箱留资的完整管理视图</p>
      </div>
      <div class="flex items-center gap-2">
        <a
          :href="starpathPreviewHref"
          target="_blank"
          rel="noopener"
          class="text-xs bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-white font-semibold px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-[0_4px_12px_rgba(245,158,11,0.2)] no-underline"
        >预览 H5</a>
        <button
          @click="handleRefresh"
          :disabled="isLoading"
          class="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
        >
          <span class="i-lucide-refresh-cw text-sm" :class="{ 'animate-spin': isLoading }" /> 刷新
        </button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-full shadow-[inset_0_1px_rgba(255,255,255,0.02)]">
      <button
        v-for="t in tabs"
        :key="t.key"
        @click="activeTab = t.key"
        class="text-[10px] font-semibold px-5 py-2.5 rounded-full transition-all cursor-pointer focus:outline-none border-0"
        :class="activeTab === t.key
          ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_rgba(255,255,255,0.05)]'
          : 'bg-transparent text-white/60 hover:text-white/90'"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ========== 概览 ========== -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
      <!-- 指标卡 -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div class="bg-white/[0.04] rounded-xl px-5 py-4 shadow-lg shadow-black/20">
          <div class="text-white/30 text-[11px] uppercase tracking-widest font-mono mb-1">问卷会话</div>
          <div class="text-white font-bold text-2xl">{{ overviewRes?.data?.sessions?.total || 0 }}</div>
          <div class="text-[#30d158] text-xs mt-1 font-mono">完成 {{ overviewRes?.data?.sessions?.completed || 0 }} · {{ overviewRes?.data?.sessions?.completionRate || 0 }}%</div>
        </div>
        <div class="bg-white/[0.04] rounded-xl px-5 py-4 shadow-lg shadow-black/20">
          <div class="text-white/30 text-[11px] uppercase tracking-widest font-mono mb-1">AI 报告</div>
          <div class="text-white font-bold text-2xl">{{ overviewRes?.data?.reports?.total || 0 }}</div>
          <div class="text-indigo-400 text-xs mt-1 font-mono">已生成 {{ overviewRes?.data?.reports?.completed || 0 }}</div>
        </div>
        <div class="bg-white/[0.04] rounded-xl px-5 py-4 shadow-lg shadow-black/20">
          <div class="text-white/30 text-[11px] uppercase tracking-widest font-mono mb-1">邮箱留资</div>
          <div class="text-white font-bold text-2xl">{{ overviewRes?.data?.emails?.total || 0 }}</div>
          <div class="text-white/30 text-xs mt-1 font-mono">智能问卷专属</div>
        </div>
      </div>

      <!-- 最近活动时间线 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- 最近问卷 -->
        <div class="bg-white/[0.04] rounded-2xl p-5 shadow-lg shadow-black/20">
          <h3 class="text-sm font-semibold text-white/80 mb-4">最近问卷会话</h3>
          <div v-if="!overviewRes?.data?.recentSessions?.length" class="text-white/25 text-xs py-4 text-center">暂无数据</div>
          <div v-else class="space-y-2">
            <div
              v-for="s in overviewRes?.data?.recentSessions"
              :key="s.id"
              class="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs text-white/80 truncate max-w-[140px]">{{ s.full_name || '匿名用户' }}</span>
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  :class="s.status === 'completed' ? 'bg-[#30d158]/10 text-[#30d158]' : s.status === 'abandoned' ? 'bg-[#ff453a]/10 text-[#ff453a]' : 'bg-blue-500/10 text-blue-400'"
                >{{ statusLabels[s.status] || s.status }}</span>
              </div>
              <span class="text-[10px] text-white/30 font-mono">{{ new Date(s.created_at).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>

        <!-- 最近报告 -->
        <div class="bg-white/[0.04] rounded-2xl p-5 shadow-lg shadow-black/20">
          <h3 class="text-sm font-semibold text-white/80 mb-4">最近 AI 报告</h3>
          <div v-if="!overviewRes?.data?.recentReports?.length" class="text-white/25 text-xs py-4 text-center">暂无数据</div>
          <div v-else class="space-y-2">
            <div
              v-for="r in overviewRes?.data?.recentReports"
              :key="r.id"
              class="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs text-indigo-400 font-mono truncate max-w-[140px]">{{ r.id?.slice(0, 12) }}...</span>
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  :class="r.status === 'completed' ? 'bg-[#30d158]/10 text-[#30d158]' : r.status === 'failed' ? 'bg-[#ff453a]/10 text-[#ff453a]' : 'bg-amber-500/10 text-amber-400'"
                >{{ statusLabels[r.status] || r.status }}</span>
              </div>
              <span class="text-[10px] text-white/30 font-mono">{{ new Date(r.created_at).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 问卷答案 ========== -->
    <div v-if="activeTab === 'answers'" class="space-y-4">
      <!-- 搜索 + 导出 -->
      <div class="flex items-center gap-3">
        <input
          v-model="search"
          type="text"
          placeholder="搜索姓名或 session key..."
          class="bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all w-72"
          @keyup.enter="onSearch"
        >
        <select
          v-model="statusFilter"
          class="bg-[#141416] border border-white/[0.08] text-xs text-white/80 rounded-full px-4 py-2 outline-none cursor-pointer"
          @change="onSearch"
        >
          <option value="">全部状态</option>
          <option value="started">已开始</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="abandoned">已放弃</option>
        </select>
        <button @click="onSearch" class="text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer">搜索</button>
        <div class="flex-1" />
        <button
          @click="exportCSV('answers')"
          :disabled="exportingType === 'answers'"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white/60 px-4 py-2 rounded-full border border-white/10 transition-all cursor-pointer"
        >{{ exportingType === 'answers' ? '导出中...' : '$\u2193 导出 CSV' }}</button>
      </div>

      <!-- 列表 -->
      <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table class="w-full text-left text-sm border-collapse">
            <thead class="sticky top-0 z-10">
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
                <th class="px-5 py-4 font-semibold font-mono">用户</th>
                <th class="px-5 py-4 font-semibold font-mono">状态</th>
                <th class="px-5 py-4 font-semibold font-mono">进度</th>
                <th class="px-5 py-4 font-semibold font-mono">回答数</th>
                <th class="px-5 py-4 font-semibold font-mono">创建时间</th>
                <th class="px-5 py-4 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="item in (answersRes?.data?.items || [])" :key="item.id" class="hover:bg-white/[0.02]">
                <td class="px-5 py-5">
                  <span class="text-white/90 text-sm">{{ item.full_name || '匿名用户' }}</span>
                  <span v-if="item.gender" class="ml-2 text-[10px] text-white/30">{{ item.gender === 'male' ? '男' : '女' }}</span>
                </td>
                <td class="px-5 py-5">
                  <span
                    class="px-3 py-1 rounded-full text-[10px] font-semibold"
                    :class="item.status === 'completed' ? 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20' : item.status === 'abandoned' ? 'bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'"
                  >{{ statusLabels[item.status] || item.status }}</span>
                </td>
                <td class="px-5 py-5 text-white/50 text-xs font-mono">步骤 {{ item.current_step }}</td>
                <td class="px-5 py-5 text-white/50 text-xs font-mono">{{ item.questionnaire_answers?.[0]?.count || 0 }}</td>
                <td class="px-5 py-5 text-white/40 font-mono text-xs">{{ new Date(item.created_at).toLocaleString() }}</td>
                <td class="px-5 py-5 text-right">
                  <button
                    @click="openAnswerDetail(item.id)"
                    class="text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 transition-all cursor-pointer"
                  >查看详情</button>
                </td>
              </tr>
              <tr v-if="!answersRes?.data?.items?.length">
                <td colspan="6" class="py-12 text-center text-xs text-white/25 font-light">暂无问卷数据</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="answersRes?.data?.pagination?.total > 0" class="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
          <div class="text-[11px] text-white/30 font-mono">共 {{ answersRes.data.pagination.total }} 条 · 第 {{ page }}/{{ Math.ceil(answersRes.data.pagination.total / 20) || 1 }} 页</div>
          <div class="flex items-center gap-2">
            <button @click="onPageChange(page - 1)" :disabled="page <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer">上一页</button>
            <button @click="onPageChange(page + 1)" :disabled="(page * 20) >= (answersRes?.data?.pagination?.total || 0)" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== AI 报告 ========== -->
    <div v-if="activeTab === 'reports'" class="space-y-4">
      <!-- 筛选 -->
      <div class="flex items-center gap-3">
        <select
          v-model="statusFilter"
          class="bg-[#141416] border border-white/[0.08] text-xs text-white/80 rounded-full px-4 py-2 outline-none cursor-pointer"
          @change="onSearch"
        >
          <option value="">全部状态</option>
          <option value="pending">待生成</option>
          <option value="generating">生成中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
        </select>
        <div class="flex-1" />
      </div>

      <!-- 列表 -->
      <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table class="w-full text-left text-sm border-collapse">
            <thead class="sticky top-0 z-10">
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
                <th class="px-5 py-4 font-semibold font-mono">报告 ID</th>
                <th class="px-5 py-4 font-semibold font-mono">Session</th>
                <th class="px-5 py-4 font-semibold font-mono">状态</th>
                <th class="px-5 py-4 font-semibold font-mono">生成时间</th>
                <th class="px-5 py-4 font-semibold font-mono">创建时间</th>
                <th class="px-5 py-4 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="item in (reportsRes?.data?.items || [])" :key="item.id" class="hover:bg-white/[0.02]">
                <td class="px-5 py-5 text-indigo-400 font-mono text-xs">{{ item.id?.slice(0, 12) }}...</td>
                <td class="px-5 py-5 text-white/50 font-mono text-xs">{{ item.session_id?.slice(0, 12) }}...</td>
                <td class="px-5 py-5">
                  <span
                    class="px-3 py-1 rounded-full text-[10px] font-semibold"
                    :class="item.status === 'completed' ? 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20' : item.status === 'failed' ? 'bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'"
                  >{{ statusLabels[item.status] || item.status }}</span>
                  <span v-if="item.error_message" class="ml-2 text-[10px] text-[#ff453a]">{{ item.error_message }}</span>
                </td>
                <td class="px-5 py-5 text-white/40 font-mono text-xs">{{ item.generated_at ? new Date(item.generated_at).toLocaleString() : '-' }}</td>
                <td class="px-5 py-5 text-white/40 font-mono text-xs">{{ new Date(item.created_at).toLocaleString() }}</td>
                <td class="px-5 py-5 text-right">
                  <button
                    v-if="item.status === 'failed' || item.status === 'completed'"
                    @click="triggerReport(item.session_id)"
                    :disabled="triggeringId === item.session_id"
                    class="text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full border border-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >{{ triggeringId === item.session_id ? '触发中...' : '重新生成' }}</button>
                </td>
              </tr>
              <tr v-if="!reportsRes?.data?.items?.length">
                <td colspan="6" class="py-12 text-center text-xs text-white/25 font-light">暂无报告数据</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="reportsRes?.data?.pagination?.total > 0" class="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
          <div class="text-[11px] text-white/30 font-mono">共 {{ reportsRes.data.pagination.total }} 条 · 第 {{ page }}/{{ Math.ceil(reportsRes.data.pagination.total / 20) || 1 }} 页</div>
          <div class="flex items-center gap-2">
            <button @click="onPageChange(page - 1)" :disabled="page <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer">上一页</button>
            <button @click="onPageChange(page + 1)" :disabled="(page * 20) >= (reportsRes?.data?.pagination?.total || 0)" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 邮箱留资 ========== -->
    <div v-if="activeTab === 'emails'" class="space-y-4">
      <!-- 搜索 + 导出 -->
      <div class="flex items-center gap-3">
        <input
          v-model="search"
          type="text"
          placeholder="搜索邮箱地址..."
          class="bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all w-72"
          @keyup.enter="onSearch"
        >
        <button @click="onSearch" class="text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer">搜索</button>
        <div class="flex-1" />
        <button
          @click="exportCSV('emails')"
          :disabled="exportingType === 'emails'"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white/60 px-4 py-2 rounded-full border border-white/10 transition-all cursor-pointer"
        >{{ exportingType === 'emails' ? '导出中...' : '$\u2193 导出 CSV' }}</button>
      </div>

      <!-- 列表 -->
      <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table class="w-full text-left text-sm border-collapse">
            <thead class="sticky top-0 z-10">
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
                <th class="px-5 py-4 font-semibold font-mono">邮箱</th>
                <th class="px-5 py-4 font-semibold font-mono">同意条款</th>
                <th class="px-5 py-4 font-semibold font-mono">退订</th>
                <th class="px-5 py-4 font-semibold font-mono">发送时间</th>
                <th class="px-5 py-4 font-semibold font-mono">创建时间</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="item in (emailsRes?.data?.items || [])" :key="item.id" class="hover:bg-white/[0.02]">
                <td class="px-5 py-5 text-white font-mono text-sm">{{ item.email }}</td>
                <td class="px-5 py-5">
                  <span :class="item.agreed_terms ? 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20' : 'bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20'" class="px-3 py-1 rounded-full text-[10px] font-semibold">{{ item.agreed_terms ? '已同意' : '未同意' }}</span>
                </td>
                <td class="px-5 py-5">
                  <span v-if="item.unsubscribed" class="px-3 py-1 rounded-full text-[10px] font-semibold bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20">已退订</span>
                  <span v-else class="text-white/20 text-xs">-</span>
                </td>
                <td class="px-5 py-5 text-white/40 font-mono text-xs">{{ item.sent_at ? new Date(item.sent_at).toLocaleString() : '-' }}</td>
                <td class="px-5 py-5 text-white/40 font-mono text-xs">{{ new Date(item.created_at).toLocaleString() }}</td>
              </tr>
              <tr v-if="!emailsRes?.data?.items?.length">
                <td colspan="5" class="py-12 text-center text-xs text-white/25 font-light">暂无留资记录</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="emailsRes?.data?.pagination?.total > 0" class="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
          <div class="text-[11px] text-white/30 font-mono">共 {{ emailsRes.data.pagination.total }} 条 · 第 {{ page }}/{{ Math.ceil(emailsRes.data.pagination.total / 20) || 1 }} 页</div>
          <div class="flex items-center gap-2">
            <button @click="onPageChange(page - 1)" :disabled="page <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer">上一页</button>
            <button @click="onPageChange(page + 1)" :disabled="(page * 20) >= (emailsRes?.data?.pagination?.total || 0)" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 答案详情弹窗 ========== -->
    <Teleport to="body">
      <div v-if="detailModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="detailModal = false">
        <div class="bg-[#12121a] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[85vh] overflow-y-auto p-7 space-y-5 animate-fade-in">
          <div class="flex justify-between items-center">
            <h2 class="text-white text-base font-semibold tracking-wide">问卷详情</h2>
            <button @click="detailModal = false" class="text-white/40 hover:text-white text-lg leading-none cursor-pointer bg-transparent border-0">&times;</button>
          </div>

          <div v-if="detailLoading" class="text-white/40 text-sm py-8 text-center">加载中...</div>

          <template v-else-if="detailData">
            <!-- Session 信息 -->
            <div class="bg-white/[0.02] rounded-xl p-4 space-y-2">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div><span class="text-white/30">姓名：</span><span class="text-white/80">{{ detailData.session?.full_name || '-' }}</span></div>
                <div><span class="text-white/30">性别：</span><span class="text-white/80">{{ detailData.session?.gender === 'male' ? '男' : detailData.session?.gender === 'female' ? '女' : '-' }}</span></div>
                <div><span class="text-white/30">出生日期：</span><span class="text-white/80">{{ detailData.session?.birth_date || '-' }}</span></div>
                <div><span class="text-white/30">出生时间：</span><span class="text-white/80">{{ detailData.session?.birth_time || '-' }}</span></div>
                <div><span class="text-white/30">出生城市：</span><span class="text-white/80">{{ detailData.session?.birth_city || '-' }}</span></div>
                <div><span class="text-white/30">状态：</span>
                  <span :class="detailData.session?.status === 'completed' ? 'text-[#30d158]' : 'text-blue-400'">{{ statusLabels[detailData.session?.status] || detailData.session?.status }}</span>
                </div>
              </div>
            </div>

            <!-- 答案列表 -->
            <div>
              <h3 class="text-sm font-semibold text-white/80 mb-3">答案记录（{{ detailData.answers?.length || 0 }} 条）</h3>
              <div v-if="!detailData.answers?.length" class="text-white/25 text-xs py-4 text-center">暂无答案</div>
              <div v-else class="space-y-2">
                <div
                  v-for="a in detailData.answers"
                  :key="a.id"
                  class="bg-white/[0.02] rounded-lg px-4 py-3 flex items-start gap-4"
                >
                  <span class="text-white/30 font-mono text-[10px] flex-shrink-0 mt-0.5">步骤 {{ a.step }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-white/50 text-[10px] font-mono mb-1">{{ a.question_key }}</div>
                    <div class="text-white/80 text-sm break-all">{{ typeof a.answer_value === 'object' ? JSON.stringify(a.answer_value) : a.answer_value }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="text-white/40 text-sm py-8 text-center">加载失败</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
