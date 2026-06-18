<script setup lang="ts">
/**
 * H5ReviewSection — H5 营销页用户评价/反馈区
 *
 * 功能：展示评价列表 + 星级统计 + 提交新评价（需登录）
 */

interface Feedback {
  id: string
  display_name: string
  rating: number | null
  comment: string | null
  admin_reply: string | null
  type: string
  created_at: string
}

interface FeedbackStats {
  total: number
  averageRating: number
  ratingDistribution: Record<number, number>
}

const props = defineProps<{
  subdomain?: string
}>()

const emit = defineEmits<{
  (e: 'login-required'): void
}>()

// 从 auth composable 获取登录状态（Nuxt auto-import）
const { isLoggedIn } = useAuth()
const { t } = useI18n()

const feedbacks = ref<Feedback[]>([])
const stats = ref<FeedbackStats>({ total: 0, averageRating: 0, ratingDistribution: {} })
const isLoading = ref(false)

// 提交表单
const showForm = ref(false)
const newRating = ref(5)
const newComment = ref('')
const isSubmitting = ref(false)
const submitSuccess = ref(false)

/** 加载评价列表 */
const fetchFeedbacks = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams({ type: 'review', pageSize: '10' })
    if (props.subdomain) params.set('subdomain', props.subdomain)
    const res = await $fetch<any>(`/api/v1/feedback?${params.toString()}`)
    feedbacks.value = res.data?.items || []
    stats.value = res.data?.stats || { total: 0, averageRating: 0, ratingDistribution: {} }
  } catch {
    feedbacks.value = []
  } finally {
    isLoading.value = false
  }
}

/** 提交评价 */
const handleSubmit = async () => {
  if (!isLoggedIn.value) {
    emit('login-required')
    return
  }

  if (!newComment.value.trim()) {
    alert(t('review.fillComment'))
    return
  }

  isSubmitting.value = true
  try {
    await $fetch('/api/v1/feedback', {
      method: 'POST',
      body: {
        campaignSubdomain: props.subdomain,
        type: 'review',
        rating: newRating.value,
        comment: newComment.value.trim(),
      },
    })
    submitSuccess.value = true
    newComment.value = ''
    newRating.value = 5
    showForm.value = false
    // 重新拉取列表
    await fetchFeedbacks()
    setTimeout(() => { submitSuccess.value = false }, 3000)
  } catch (e: any) {
    alert(e.data?.statusMessage || t('review.submitFailed'))
  } finally {
    isSubmitting.value = false
  }
}

/** 渲染星级 */
const renderStars = (rating: number): string => {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

/** 相对时间 */
const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('review.justNow')
  if (mins < 60) return t('review.minutesAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('review.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return t('review.daysAgo', { n: days })
  return t('review.monthsAgo', { n: Math.floor(days / 30) })
}

onMounted(fetchFeedbacks)
</script>

<template>
  <div class="space-y-4">
    <!-- 标题与统计 -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-bold text-white">{{ t('review.title') }}</h3>
      <span v-if="stats.total > 0" class="text-[10px] text-slate-500">
        {{ t('review.reviews', { count: stats.total }) }} · {{ t('review.avgScore', { score: stats.averageRating }) }}
      </span>
    </div>

    <!-- 评分分布条 -->
    <div v-if="stats.total > 0" class="space-y-1">
      <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="flex items-center gap-2 text-[10px]">
        <span class="text-amber-400 w-3">{{ star }}★</span>
        <div class="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-amber-400 rounded-full transition-all"
            :style="{ width: `${stats.total > 0 ? ((stats.ratingDistribution[star] || 0) / stats.total * 100) : 0}%` }"
          />
        </div>
        <span class="text-slate-600 w-4 text-right">{{ stats.ratingDistribution[star] || 0 }}</span>
      </div>
    </div>

    <!-- 评价列表 -->
    <div v-if="feedbacks.length > 0" class="space-y-3">
      <div
        v-for="fb in feedbacks"
        :key="fb.id"
        class="p-3 bg-white/[0.03] border border-white/5 rounded-xl"
      >
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-semibold text-white">{{ fb.display_name }}</span>
          <span class="text-[9px] text-slate-600">{{ relativeTime(fb.created_at) }}</span>
        </div>
        <div class="text-amber-400 text-xs mb-1.5">{{ renderStars(fb.rating || 0) }}</div>
        <p class="text-[11px] text-slate-400 leading-relaxed">{{ fb.comment }}</p>
        <!-- 管理员回复 -->
        <div v-if="fb.admin_reply" class="mt-2 ml-3 pl-2 border-l-2 border-indigo-500/30">
          <span class="text-[9px] text-indigo-400 font-medium">{{ t('review.adminReply') }}</span>
          <p class="text-[10px] text-slate-500 mt-0.5">{{ fb.admin_reply }}</p>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!isLoading" class="text-center py-4">
      <p class="text-[11px] text-slate-600">{{ t('review.noReviews') }}</p>
    </div>

    <!-- 提交成功提示 -->
    <div v-if="submitSuccess" class="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
      <span class="text-[11px] text-emerald-400 font-medium">{{ t('review.thankYou') }}</span>
    </div>

    <!-- 写评价按钮 / 表单 -->
    <div v-if="!showForm">
      <button
        @click="showForm = true"
        class="w-full text-[11px] font-medium py-2.5 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 transition-all"
      >
        {{ t('review.writeReview') }}
      </button>
    </div>

    <div v-else class="space-y-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
      <!-- 星级选择 -->
      <div class="flex items-center gap-1">
        <span class="text-[10px] text-slate-500 mr-2">{{ t('review.rating') }}</span>
        <button
          v-for="s in 5"
          :key="s"
          @click="newRating = s"
          class="text-lg transition-transform hover:scale-125"
          :class="s <= newRating ? 'text-amber-400' : 'text-slate-700'"
        >
          ★
        </button>
      </div>

      <!-- 评论输入 -->
      <textarea
        v-model="newComment"
        rows="3"
        :placeholder="t('review.commentPlaceholder')"
        maxlength="500"
        class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none transition-all"
      />

      <!-- 操作按钮 -->
      <div class="flex gap-2">
        <button
          @click="showForm = false"
          class="flex-1 text-[10px] py-2 rounded-xl border border-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          @click="handleSubmit"
          :disabled="isSubmitting || !newComment.trim()"
          class="flex-1 text-[10px] font-bold py-2 rounded-xl text-white transition-all active:scale-95"
          :class="[
            isSubmitting || !newComment.trim() ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500',
          ]"
        >
          {{ isSubmitting ? t('review.submitting') : t('review.submitReview') }}
        </button>
      </div>
    </div>
  </div>
</template>
