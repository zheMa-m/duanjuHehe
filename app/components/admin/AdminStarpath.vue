<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useCampaignPreviewUrl } from '~/composables/useCampaignPreviewUrl'
import { getQuestionText } from '~/utils/starpath-data'

const { t } = useI18n()
const { href: starpathPreviewHref } = useCampaignPreviewUrl('starpath')

// ── Intro 标签映射 ──
const relationshipLabels: Record<string, string> = {
  single: '单身', dating: '恋爱中', committed: '已婚', complicated: '复杂关系',
}
const introLabels: Record<string, string> = {
  familiarity: '占星熟悉度', focus: '关注领域', goal: '核心目标', relationship: '感情状态',
}

// ── 状态 ──
const activeTab = ref('overview')
const page = ref(1)
const search = ref('')
const statusFilter = ref('')
const isLoading = ref(false)

// ── Tab 定义 ──
const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'orders', label: '订单' },
  { key: 'answers', label: '问卷答案' },
  { key: 'reports', label: 'AI 报告' },
  { key: 'emails', label: '邮箱留资' },
]

const statusLabels: Record<string, string> = {
  started: '已开始', in_progress: '进行中', completed: '已完成', abandoned: '已放弃',
  pending: '待付款', generating: '生成中', failed: '失败',
  paid: '已付款', expired: '已过期', refunded: '已退款',
}

const providerLabels: Record<string, string> = {
  stripe: 'Card', paypal: 'PayPal', apple_iap: 'Apple Pay', google_pay: 'Google Pay',
}

/** 获取题目文本（使用 starpath-data 静态映射，确保后台始终显示完整题目） */
function questionLabel(key: string): string {
  // key 形如 q1..q18，直接查 questionTexts
  const text = getQuestionText(key)
  return text !== key ? text : key.toUpperCase()
}

/** 格式化 intro 值 */
function formatIntroValue(key: string, value: string | null): string {
  if (!value) return '-'
  if (key === 'relationship') return relationshipLabels[value] || value
  try {
    const arr = JSON.parse(value)
    if (Array.isArray(arr)) return arr.join(', ')
  } catch {}
  return value
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

// ── 订单列表 ──
const platformFilter = ref('')
const { data: ordersRes, refresh: refreshOrders } = useFetch<any>('/api/admin/starpath/orders', {
  query: computed(() => ({
    page: page.value, pageSize: 20,
    status: statusFilter.value || undefined,
    search: search.value || undefined,
    platform: platformFilter.value || undefined,
  })),
  lazy: true, immediate: false,
})

// ── Tab 切换 ──
watch(activeTab, (tab) => {
  page.value = 1
  search.value = ''
  statusFilter.value = ''
  platformFilter.value = ''
  if (tab === 'overview') refreshOverview()
  else if (tab === 'orders') refreshOrders()
  else if (tab === 'answers') refreshAnswers()
  else if (tab === 'reports') refreshReports()
  else if (tab === 'emails') refreshEmails()
}, { immediate: true })

// ── 分页 ──
function onPageChange(newPage: number) {
  page.value = newPage
  if (activeTab.value === 'orders') refreshOrders()
  else if (activeTab.value === 'answers') refreshAnswers()
  else if (activeTab.value === 'reports') refreshReports()
  else if (activeTab.value === 'emails') refreshEmails()
}

function onSearch() {
  page.value = 1
  if (activeTab.value === 'orders') refreshOrders()
  else if (activeTab.value === 'answers') refreshAnswers()
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
    detailData.value = (res as any).data ?? res
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
    else if (activeTab.value === 'orders') await refreshOrders()
    else if (activeTab.value === 'answers') await refreshAnswers()
    else if (activeTab.value === 'reports') await refreshReports()
    else if (activeTab.value === 'emails') await refreshEmails()
  } finally {
    isLoading.value = false
  }
}

// ── 订单退款 ──
const refundModal = ref(false)
const refundOrder = ref<any>(null)
const refundAmount = ref('')
const refundLoading = ref(false)

function openRefundModal(order: any) {
  refundOrder.value = order
  refundAmount.value = ''
  refundModal.value = true
}

async function submitRefund() {
  if (!refundOrder.value) return
  refundLoading.value = true
  try {
    const body: any = {}
    if (refundAmount.value && Number(refundAmount.value) < parseFloat(refundOrder.value.amount)) {
      body.refundAmount = Number(refundAmount.value)
    }
    await $fetch(`/api/admin/orders/${refundOrder.value.id}/refund`, { method: 'POST', body })
    refundModal.value = false
    refreshOrders()
  } catch (e: any) {
    console.error('Refund failed:', e)
    alert(e?.data?.statusMessage || e?.message || '退款失败')
  } finally {
    refundLoading.value = false
  }
}

// ── 交易流水 ──
const txModal = ref(false)
const txData = ref<any[]>([])
const txLoading = ref(false)
const txOrderId = ref('')

async function openTxModal(orderId: string) {
  txOrderId.value = orderId
  txModal.value = true
  txLoading.value = true
  txData.value = []
  try {
    const res = await $fetch<any>(`/api/admin/orders/${orderId}/transactions`)
    txData.value = res?.data?.items || []
  } catch (e: any) {
    console.error('Failed to load transactions:', e)
  } finally {
    txLoading.value = false
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
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white/[0.04] rounded-xl px-5 py-4 shadow-lg shadow-black/20">
          <div class="text-white/30 text-[11px] uppercase tracking-widest font-mono mb-1">问卷会话</div>
          <div class="text-white font-bold text-2xl">{{ overviewRes?.data?.sessions?.total || 0 }}</div>
          <div class="text-[#30d158] text-xs mt-1 font-mono">完成 {{ overviewRes?.data?.sessions?.completed || 0 }} · {{ overviewRes?.data?.sessions?.completionRate || 0 }}%</div>
        </div>
        <div class="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl px-5 py-4 shadow-lg shadow-black/20 border border-amber-500/10">
          <div class="text-amber-400/60 text-[11px] uppercase tracking-widest font-mono mb-1">营收</div>
          <div class="text-white font-bold text-2xl">${{ overviewRes?.data?.orders?.revenue || 0 }}</div>
          <div class="text-amber-400 text-xs mt-1 font-mono">{{ overviewRes?.data?.orders?.paid || 0 }} 笔付款 · 转化 {{ overviewRes?.data?.orders?.conversionRate || 0 }}%</div>
        </div>
        <div class="bg-white/[0.04] rounded-xl px-5 py-4 shadow-lg shadow-black/20">
          <div class="text-white/30 text-[11px] uppercase tracking-widest font-mono mb-1">订单</div>
          <div class="text-white font-bold text-2xl">{{ overviewRes?.data?.orders?.total || 0 }}</div>
          <div class="text-[#30d158] text-xs mt-1 font-mono">已付 {{ overviewRes?.data?.orders?.paid || 0 }} · 待付 {{ (overviewRes?.data?.orders?.total || 0) - (overviewRes?.data?.orders?.paid || 0) }}</div>
        </div>
        <div class="bg-white/[0.04] rounded-xl px-5 py-4 shadow-lg shadow-black/20">
          <div class="text-white/30 text-[11px] uppercase tracking-widest font-mono mb-1">报告 / 留资</div>
          <div class="text-white font-bold text-2xl">{{ overviewRes?.data?.reports?.total || 0 }} <span class="text-white/20 text-base">/</span> {{ overviewRes?.data?.emails?.total || 0 }}</div>
          <div class="text-indigo-400 text-xs mt-1 font-mono">报告 {{ overviewRes?.data?.reports?.completed || 0 }} 已生成</div>
        </div>
      </div>

      <!-- 最近活动时间线 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- 最近订单（突出展示） -->
        <div class="bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl p-5 shadow-lg shadow-black/20 border border-amber-500/5">
          <h3 class="text-sm font-semibold text-amber-400/80 mb-4">最近订单</h3>
          <div v-if="!overviewRes?.data?.recentOrders?.length" class="text-white/25 text-xs py-4 text-center">暂无订单</div>
          <div v-else class="space-y-2">
            <div
              v-for="o in overviewRes?.data?.recentOrders"
              :key="o.id"
              class="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs text-white font-mono font-bold">${{ parseFloat(o.amount).toFixed(2) }}</span>
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  :class="o.status === 'paid' ? 'bg-[#30d158]/10 text-[#30d158]' : o.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#ff453a]/10 text-[#ff453a]'"
                >{{ statusLabels[o.status] || o.status }}</span>
                <span class="text-[9px] text-white/30">{{ providerLabels[o.payment_provider] || o.payment_provider }}</span>
              </div>
              <span class="text-[10px] text-white/30 font-mono">{{ new Date(o.created_at).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>

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
                <span class="text-xs text-indigo-400 font-mono truncate max-w-[100px]">{{ r.id?.slice(0, 12) }}...</span>
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  :class="r.status === 'completed' ? 'bg-[#30d158]/10 text-[#30d158]' : r.status === 'failed' ? 'bg-[#ff453a]/10 text-[#ff453a]' : 'bg-amber-500/10 text-amber-400'"
                >{{ statusLabels[r.status] || r.status }}</span>
                <span v-if="r.email_sent" class="text-[9px] text-[#30d158]" title="已发送邮件">✓ 已发</span>
              </div>
              <span class="text-[10px] text-white/30 font-mono">{{ new Date(r.created_at).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 订单 ========== -->
    <div v-if="activeTab === 'orders'" class="space-y-4">
      <!-- 筛选 -->
      <div class="flex items-center gap-3 flex-wrap">
        <input
          v-model="search"
          type="text"
          placeholder="搜索订单号..."
          class="bg-white/[0.03] border border-white/[0.08] focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition-all w-56"
          @keyup.enter="onSearch"
        >
        <select
          v-model="statusFilter"
          class="bg-[#141416] border border-white/[0.08] text-xs text-white/80 rounded-full px-4 py-2 outline-none cursor-pointer"
          @change="onSearch"
        >
          <option value="">全部状态</option>
          <option value="pending">待付款</option>
          <option value="paid">已付款</option>
          <option value="expired">已过期</option>
          <option value="failed">失败</option>
          <option value="refunded">已退款</option>
        </select>
        <select
          v-model="platformFilter"
          class="bg-[#141416] border border-white/[0.08] text-xs text-white/80 rounded-full px-4 py-2 outline-none cursor-pointer"
          @change="onSearch"
        >
          <option value="">全部平台</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
          <option value="web">Web</option>
        </select>
        <button @click="onSearch" class="text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full border border-amber-500/20 transition-all active:scale-[0.98] cursor-pointer">搜索</button>
        <div class="flex-1" />
        <div class="text-[11px] text-white/30 font-mono">
          共 {{ ordersRes?.data?.pagination?.total || 0 }} 笔订单
        </div>
      </div>

      <!-- 列表 -->
      <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table class="w-full text-left text-sm border-collapse">
            <thead class="sticky top-0 z-10">
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
                <th class="px-5 py-4 font-semibold font-mono">订单号</th>
                <th class="px-5 py-4 font-semibold font-mono">金额</th>
                <th class="px-5 py-4 font-semibold font-mono">状态</th>
                <th class="px-5 py-4 font-semibold font-mono">支付方式</th>
                <th class="px-5 py-4 font-semibold font-mono">平台</th>
                <th class="px-5 py-4 font-semibold font-mono">关联报告</th>
                <th class="px-5 py-4 font-semibold font-mono">创建时间</th>
                <th class="px-5 py-4 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="item in (ordersRes?.data?.items || [])" :key="item.id" class="hover:bg-white/[0.02]">
                <td class="px-5 py-5 text-white/80 font-mono text-xs">{{ item.order_no?.replace('ORD-', '') || item.id?.slice(0, 8) }}</td>
                <td class="px-5 py-5">
                  <span class="text-white font-bold text-sm">${{ parseFloat(item.amount || 0).toFixed(2) }}</span>
                  <span v-if="item.original_amount && parseFloat(item.original_amount) > parseFloat(item.amount)" class="ml-1 text-[10px] text-white/30 line-through">${{ parseFloat(item.original_amount).toFixed(2) }}</span>
                </td>
                <td class="px-5 py-5">
                  <span
                    class="px-3 py-1 rounded-full text-[10px] font-semibold"
                    :class="item.status === 'paid' ? 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20' : item.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : item.status === 'refunded' ? 'bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20' : 'bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20'"
                  >{{ statusLabels[item.status] || item.status }}</span>
                </td>
                <td class="px-5 py-5 text-white/50 text-xs">{{ providerLabels[item.payment_provider] || item.payment_provider }}</td>
                <td class="px-5 py-5 text-white/40 text-xs font-mono">{{ item.campaign_order?.platform || '-' }}</td>
                <td class="px-5 py-5">
                  <span v-if="item.campaign_order?.report_id" class="text-indigo-400 font-mono text-[10px]">{{ item.campaign_order.report_id.slice(0, 8) }}...</span>
                  <span v-else class="text-white/20 text-xs">-</span>
                </td>
                <td class="px-5 py-5 text-white/40 font-mono text-xs">{{ new Date(item.created_at).toLocaleString() }}</td>
                <td class="px-5 py-5 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      @click="openTxModal(item.id)"
                      class="text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-white/60 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer"
                    >流水</button>
                    <button
                      v-if="item.status === 'paid'"
                      @click="openRefundModal(item)"
                      class="text-[10px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-3 py-1.5 rounded-full border border-[#ff453a]/20 transition-all cursor-pointer"
                    >退款</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!ordersRes?.data?.items?.length">
                <td colspan="8" class="py-12 text-center text-xs text-white/25 font-light">暂无订单数据</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="ordersRes?.data?.pagination?.total > 0" class="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
          <div class="text-[11px] text-white/30 font-mono">共 {{ ordersRes.data.pagination.total }} 条 · 第 {{ page }}/{{ Math.ceil(ordersRes.data.pagination.total / 20) || 1 }} 页</div>
          <div class="flex items-center gap-2">
            <button @click="onPageChange(page - 1)" :disabled="page <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer">上一页</button>
            <button @click="onPageChange(page + 1)" :disabled="(page * 20) >= (ordersRes?.data?.pagination?.total || 0)" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer">下一页</button>
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
                <th class="px-5 py-4 font-semibold font-mono">出生信息</th>
                <th class="px-5 py-4 font-semibold font-mono">用户画像</th>
                <th class="px-5 py-4 font-semibold font-mono">邮箱</th>
                <th class="px-5 py-4 font-semibold font-mono">状态</th>
                <th class="px-5 py-4 font-semibold font-mono">进度</th>
                <th class="px-5 py-4 font-semibold font-mono">创建时间</th>
                <th class="px-5 py-4 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="item in (answersRes?.data?.items || [])" :key="item.id" class="hover:bg-white/[0.02]">
                <td class="px-5 py-5">
                  <span class="text-white/90 text-sm">{{ item.full_name || '匿名用户' }}</span>
                  <span v-if="item.gender" class="ml-2 text-[10px] text-white/30">{{ item.gender === 'male' ? '♂' : '♀' }}</span>
                </td>
                <td class="px-5 py-5">
                  <div class="text-xs text-white/60 leading-relaxed">
                    <span v-if="item.birth_date" class="block font-mono">{{ item.birth_date }}</span>
                    <span v-if="item.birth_time" class="text-[10px] text-white/30 font-mono">{{ item.birth_time }}</span>
                    <span v-if="item.birth_city" class="block text-[10px] text-white/40">{{ item.birth_city }}</span>
                    <span v-if="!item.birth_date && !item.birth_city" class="text-white/15">-</span>
                  </div>
                </td>
                <td class="px-5 py-5">
                  <div class="flex flex-wrap gap-1">
                    <span v-if="item.intro?.familiarity" class="px-2 py-0.5 rounded-full text-[9px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/15">{{ item.intro.familiarity }}</span>
                    <span v-if="item.intro?.focus" class="px-2 py-0.5 rounded-full text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/15">{{ formatIntroValue('focus', item.intro.focus) }}</span>
                    <span v-if="item.intro?.goal" class="px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">{{ item.intro.goal }}</span>
                    <span v-if="item.intro?.relationship" class="px-2 py-0.5 rounded-full text-[9px] font-medium bg-pink-500/10 text-pink-400 border border-pink-500/15">{{ relationshipLabels[item.intro.relationship] || item.intro.relationship }}</span>
                    <span v-if="!item.intro" class="text-white/15 text-xs">-</span>
                  </div>
                </td>
                <td class="px-5 py-5">
                  <span v-if="item.email" class="text-xs text-indigo-400 font-medium">{{ item.email }}</span>
                  <span v-else class="text-white/15 text-xs">-</span>
                </td>
                <td class="px-5 py-5">
                  <span
                    class="px-3 py-1 rounded-full text-[10px] font-semibold"
                    :class="item.status === 'completed' ? 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20' : item.status === 'abandoned' ? 'bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'"
                  >{{ statusLabels[item.status] || item.status }}</span>
                </td>
                <td class="px-5 py-5 text-white/50 text-xs font-mono">{{ item.current_step }}/18</td>
                <td class="px-5 py-5 text-white/40 font-mono text-xs">{{ new Date(item.created_at).toLocaleDateString() }}</td>
                <td class="px-5 py-5 text-right">
                  <button
                    @click="openAnswerDetail(item.id)"
                    class="text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 transition-all cursor-pointer"
                  >详情</button>
                </td>
              </tr>
              <tr v-if="!answersRes?.data?.items?.length">
                <td colspan="8" class="py-12 text-center text-xs text-white/25 font-light">暂无问卷数据</td>
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
                <th class="px-5 py-4 font-semibold font-mono">邮件</th>
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
                <td class="px-5 py-5">
                  <span v-if="item.email_sent" class="px-3 py-1 rounded-full text-[10px] font-semibold bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20">✓ 已发送</span>
                  <span v-else class="text-white/20 text-xs">未发送</span>
                  <span v-if="item.email_sent_at" class="block text-[9px] text-white/30 font-mono mt-1">{{ new Date(item.email_sent_at).toLocaleDateString() }}</span>
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
                <td colspan="7" class="py-12 text-center text-xs text-white/25 font-light">暂无报告数据</td>
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
        <div class="bg-[#12121a] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[85vh] overflow-y-auto p-7 space-y-5 animate-fade-in">
          <div class="flex justify-between items-center">
            <h2 class="text-white text-base font-semibold tracking-wide">问卷详情</h2>
            <button @click="detailModal = false" class="text-white/40 hover:text-white text-lg leading-none cursor-pointer bg-transparent border-0">&times;</button>
          </div>

          <div v-if="detailLoading" class="text-white/40 text-sm py-8 text-center">加载中...</div>

          <template v-else-if="detailData">
            <!-- 用户画像卡片 -->
            <div class="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-xl p-5 border border-white/[0.06]">
              <div class="flex items-center gap-4 mb-4">
                <div class="size-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg font-bold text-indigo-400">
                  {{ detailData.session?.full_name?.charAt(0) || '?' }}
                </div>
                <div>
                  <div class="text-white font-semibold text-sm">{{ detailData.session?.full_name || '匿名用户' }}</div>
                  <div class="text-white/40 text-xs">
                    {{ detailData.session?.gender === 'male' ? '♂ 男' : detailData.session?.gender === 'female' ? '♀ 女' : '未知' }}
                    <span v-if="detailData.session?.birth_date" class="ml-2 font-mono">{{ detailData.session.birth_date }}</span>
                    <span v-if="detailData.session?.birth_time" class="ml-1 font-mono text-white/25">{{ detailData.session.birth_time }}</span>
                  </div>
                  <div v-if="detailData.session?.birth_city" class="text-white/30 text-[10px] mt-0.5">{{ detailData.session.birth_city }}</div>
                </div>
                <div class="ml-auto flex flex-col items-end gap-2">
                  <span
                    class="px-3 py-1 rounded-full text-[10px] font-semibold"
                    :class="detailData.session?.status === 'completed' ? 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'"
                  >{{ statusLabels[detailData.session?.status] || detailData.session?.status }}</span>
                  <span v-if="detailData.email" class="px-3 py-1 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                    <span class="i-lucide-mail text-[9px]" />
                    {{ detailData.email }}
                  </span>
                </div>
              </div>

              <!-- Intro 画像 -->
              <div v-if="detailData.introAnswers?.length" class="grid grid-cols-3 gap-3">
                <div v-for="ia in detailData.introAnswers" :key="ia.key" class="bg-white/[0.03] rounded-lg px-3 py-2">
                  <div class="text-[9px] uppercase tracking-wider text-white/25 mb-1">
                    {{ introLabels[ia.key] || ia.key }}
                  </div>
                  <div class="text-xs text-white/80 font-medium">{{ formatIntroValue(ia.key, ia.value) }}</div>
                </div>
              </div>
            </div>

            <!-- 答案网格 -->
            <div>
              <h3 class="text-sm font-semibold text-white/80 mb-3">问卷答案（{{ detailData.answers?.length || 0 }} 题）</h3>
              <div v-if="!detailData.answers?.length" class="text-white/25 text-xs py-4 text-center">暂无答案</div>
              <div v-else class="grid grid-cols-2 gap-2">
                <div
                  v-for="a in detailData.answers"
                  :key="a.id"
                  class="bg-white/[0.02] rounded-lg px-3 py-2.5 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                >
                  <div class="text-[9px] text-indigo-400/60 font-mono uppercase mb-1">Q{{ a.step }}</div>
                  <div class="text-[10px] text-white/40 leading-snug mb-1.5 line-clamp-2">{{ questionLabel(a.question_key) }}</div>
                  <div class="text-xs text-white/90 font-medium">{{ typeof a.answer_value === 'object' ? JSON.stringify(a.answer_value) : a.answer_value }}</div>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="text-white/40 text-sm py-8 text-center">加载失败</div>
        </div>
      </div>
    </Teleport>

    <!-- ========== 退款弹窗 ========== -->
    <Teleport to="body">
      <div v-if="refundModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="refundModal = false">
        <div class="bg-[#12121a] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] w-full max-w-md p-7 space-y-5 animate-fade-in">
          <div class="flex justify-between items-center">
            <h2 class="text-white text-base font-semibold">订单退款</h2>
            <button @click="refundModal = false" class="text-white/40 hover:text-white text-lg leading-none cursor-pointer bg-transparent border-0">&times;</button>
          </div>
          <div v-if="refundOrder" class="space-y-4">
            <div class="bg-white/[0.04] rounded-xl p-4 space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-white/40">订单号</span>
                <span class="text-white font-mono">{{ refundOrder.order_no || refundOrder.id?.slice(0, 8) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-white/40">订单金额</span>
                <span class="text-white font-bold">${{ parseFloat(refundOrder.amount || 0).toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-white/40">支付方式</span>
                <span class="text-white/60">{{ providerLabels[refundOrder.payment_provider] || refundOrder.payment_provider }}</span>
              </div>
            </div>
            <div>
              <label class="text-xs text-white/40 block mb-2">退款金额（留空则全额退款）</label>
              <input
                v-model="refundAmount"
                type="number"
                :max="parseFloat(refundOrder.amount)"
                min="0.01"
                step="0.01"
                :placeholder="parseFloat(refundOrder.amount).toFixed(2)"
                class="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#ff453a]/50"
              >
            </div>
            <div class="flex gap-3">
              <button @click="refundModal = false" class="flex-1 text-sm font-semibold bg-white/5 hover:bg-white/10 text-white/60 py-3 rounded-xl border border-white/10 transition-all cursor-pointer">取消</button>
              <button
                @click="submitRefund"
                :disabled="refundLoading"
                class="flex-1 text-sm font-semibold bg-[#ff453a] hover:bg-[#ff453a]/80 disabled:opacity-50 text-white py-3 rounded-xl transition-all cursor-pointer"
              >{{ refundLoading ? '处理中...' : '确认退款' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ========== 交易流水弹窗 ========== -->
    <Teleport to="body">
      <div v-if="txModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="txModal = false">
        <div class="bg-[#12121a] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[80vh] overflow-y-auto p-7 space-y-5 animate-fade-in">
          <div class="flex justify-between items-center">
            <h2 class="text-white text-base font-semibold">支付交易流水</h2>
            <button @click="txModal = false" class="text-white/40 hover:text-white text-lg leading-none cursor-pointer bg-transparent border-0">&times;</button>
          </div>
          <div v-if="txLoading" class="text-white/40 text-sm py-8 text-center">加载中...</div>
          <div v-else-if="!txData.length" class="text-white/25 text-sm py-8 text-center">暂无交易流水</div>
          <div v-else class="space-y-2">
            <div
              v-for="tx in txData"
              :key="tx.id"
              class="bg-white/[0.03] rounded-xl px-5 py-4 border border-white/[0.05]"
            >
              <div class="flex items-center justify-between mb-2">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="tx.type === 'refund' || tx.type === 'partial_refund' ? 'bg-[#ff453a]/10 text-[#ff453a]' : tx.type === 'capture' ? 'bg-[#30d158]/10 text-[#30d158]' : 'bg-blue-500/10 text-blue-400'"
                >{{ tx.type }}</span>
                <span class="text-[10px] text-white/30 font-mono">{{ new Date(tx.created_at).toLocaleString() }}</span>
              </div>
              <div class="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div class="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">金额</div>
                  <div class="text-white font-bold">{{ tx.amount ? '$' + parseFloat(tx.amount).toFixed(2) : '-' }}</div>
                </div>
                <div>
                  <div class="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">状态</div>
                  <div class="text-white/70">{{ tx.status }}</div>
                </div>
                <div>
                  <div class="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">网关 ID</div>
                  <div class="text-white/50 font-mono text-[10px] truncate">{{ tx.gateway_transaction_id || '-' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
