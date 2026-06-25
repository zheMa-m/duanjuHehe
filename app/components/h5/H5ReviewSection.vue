<script setup lang="ts">
/**
 * H5ReviewSection — H5 营销页用户评价/反馈区
 * Huashu Design 重构 — Glassmorphism 对齐
 */
interface Feedback { id: string; display_name: string; rating: number | null; comment: string | null; admin_reply: string | null; type: string; created_at: string }
interface FeedbackStats { total: number; averageRating: number; ratingDistribution: Record<number, number> }

const props = defineProps<{ subdomain?: string }>()
const emit = defineEmits<{ (e: 'login-required'): void }>()
const { isLoggedIn } = useAuth()
const { t } = useI18n()

const feedbacks = ref<Feedback[]>([])
const stats = ref<FeedbackStats>({ total: 0, averageRating: 0, ratingDistribution: {} })
const isLoading = ref(false)
const showForm = ref(false)
const newRating = ref(5)
const newComment = ref('')
const isSubmitting = ref(false)
const submitSuccess = ref(false)

const fetchFeedbacks = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams({ type: 'review', pageSize: '10' })
    if (props.subdomain) params.set('subdomain', props.subdomain)
    const res = await $fetch<any>(`/api/v1/feedback?${params.toString()}`)
    feedbacks.value = res.data?.items || []
    stats.value = res.data?.stats || { total: 0, averageRating: 0, ratingDistribution: {} }
  } catch { feedbacks.value = [] } finally { isLoading.value = false }
}

const handleSubmit = async () => {
  if (!isLoggedIn.value) { emit('login-required'); return }
  if (!newComment.value.trim()) { alert(t('review.fillComment')); return }
  isSubmitting.value = true
  try {
    await $fetch('/api/v1/feedback', { method: 'POST', body: { campaignSubdomain: props.subdomain, type: 'review', rating: newRating.value, comment: newComment.value.trim() } })
    submitSuccess.value = true; newComment.value = ''; newRating.value = 5; showForm.value = false
    await fetchFeedbacks()
    setTimeout(() => { submitSuccess.value = false }, 3000)
  } catch (e: any) { alert(e.data?.statusMessage || t('review.submitFailed')) } finally { isSubmitting.value = false }
}

const renderStars = (rating: number): string => '★'.repeat(rating) + '☆'.repeat(5 - rating)
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
  <div class="review-root">
    <div class="review-header">
      <h3 class="review-title">{{ t('review.title') }}</h3>
      <span v-if="stats.total > 0" class="review-count">{{ t('review.reviews', { count: stats.total }) }} · {{ t('review.avgScore', { score: stats.averageRating }) }}</span>
    </div>

    <div v-if="stats.total > 0" class="rating-bars">
      <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="rating-row">
        <span class="rating-star">{{ star }}★</span>
        <div class="rating-track"><div class="rating-fill" :style="{ width: `${stats.total > 0 ? ((stats.ratingDistribution[star] || 0) / stats.total * 100) : 0}%` }" /></div>
        <span class="rating-num">{{ stats.ratingDistribution[star] || 0 }}</span>
      </div>
    </div>

    <div v-if="feedbacks.length > 0" class="feedback-list">
      <div v-for="fb in feedbacks" :key="fb.id" class="feedback-card">
        <div class="feedback-top">
          <span class="feedback-name">{{ fb.display_name }}</span>
          <span class="feedback-time">{{ relativeTime(fb.created_at) }}</span>
        </div>
        <div class="feedback-stars">{{ renderStars(fb.rating || 0) }}</div>
        <p class="feedback-comment">{{ fb.comment }}</p>
        <div v-if="fb.admin_reply" class="admin-reply">
          <span class="admin-label">{{ t('review.adminReply') }}</span>
          <p class="admin-text">{{ fb.admin_reply }}</p>
        </div>
      </div>
    </div>

    <div v-else-if="!isLoading" class="empty-state"><p class="empty-text">{{ t('review.noReviews') }}</p></div>

    <div v-if="submitSuccess" class="success-toast"><span class="success-text">{{ t('review.thankYou') }}</span></div>

    <div v-if="!showForm" class="write-trigger-wrap">
      <button @click="showForm = true" class="write-trigger">{{ t('review.writeReview') }}</button>
    </div>

    <div v-else class="write-form">
      <div class="star-picker">
        <span class="picker-label">{{ t('review.rating') }}</span>
        <button v-for="s in 5" :key="s" @click="newRating = s" class="star-btn" :class="{ 'star-active': s <= newRating }">★</button>
      </div>
      <textarea v-model="newComment" rows="3" :placeholder="t('review.commentPlaceholder')" maxlength="500" class="comment-input" />
      <div class="form-actions">
        <button @click="showForm = false" class="btn-cancel">{{ t('common.cancel') }}</button>
        <button @click="handleSubmit" :disabled="isSubmitting || !newComment.trim()" class="btn-submit" :class="{ 'btn-submit--disabled': isSubmitting || !newComment.trim() }">
          {{ isSubmitting ? t('review.submitting') : t('review.submitReview') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-root { display: flex; flex-direction: column; gap: 16px; }
.review-header { display: flex; align-items: center; justify-content: space-between; }
.review-title { font-size: 0.875rem; font-weight: 700; color: #F1F5F9; }
.review-count { font-size: 10px; color: #64748B; font-family: 'JetBrains Mono',monospace; }

.rating-bars { display: flex; flex-direction: column; gap: 5px; }
.rating-row { display: flex; align-items: center; gap: 8px; font-size: 10px; }
.rating-star { color: #D4A853; width: 14px; font-size: 10px; }
.rating-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; }
.rating-fill { height: 100%; background: #D4A853; border-radius: 100px; transition: width 0.6s cubic-bezier(0.16,1,0.3,1); }
.rating-num { color: #64748B; width: 18px; text-align: right; font-family: 'JetBrains Mono',monospace; font-size: 9px; }

.feedback-list { display: flex; flex-direction: column; gap: 10px; }
.feedback-card { padding: 14px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; transition: border-color 0.2s ease; }
.feedback-card:hover { border-color: rgba(255,255,255,0.12); }
.feedback-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.feedback-name { font-size: 11px; font-weight: 600; color: #F1F5F9; }
.feedback-time { font-size: 9px; color: #64748B; font-family: 'JetBrains Mono',monospace; }
.feedback-stars { color: #D4A853; font-size: 11px; margin-bottom: 6px; letter-spacing: 1px; }
.feedback-comment { font-size: 11px; color: #94A3B8; line-height: 1.6; }

.admin-reply { margin-top: 10px; margin-left: 12px; padding-left: 10px; border-left: 2px solid rgba(212,168,83,0.2); }
.admin-label { font-size: 9px; color: #D4A853; font-weight: 600; }
.admin-text { font-size: 10px; color: #64748B; margin-top: 3px; line-height: 1.5; }

.empty-state { text-align: center; padding: 16px 0; }
.empty-text { font-size: 11px; color: #64748B; }

.success-toast { padding: 10px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15); border-radius: 10px; text-align: center; }
.success-text { font-size: 11px; color: #10B981; font-weight: 500; }

.write-trigger-wrap { margin-top: 2px; }
.write-trigger {
  width: 100%; font-size: 11px; font-weight: 500; padding: 10px;
  border-radius: 10px; border: 1px dashed rgba(255,255,255,0.12);
  background: transparent; color: #94A3B8; cursor: pointer; transition: all 0.2s ease;
}
.write-trigger:hover { border-color: rgba(212,168,83,0.3); color: #D4A853; background: rgba(212,168,83,0.06); }

.write-form { padding: 14px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; display: flex; flex-direction: column; gap: 12px; }
.star-picker { display: flex; align-items: center; gap: 4px; }
.picker-label { font-size: 10px; color: #64748B; margin-right: 8px; }
.star-btn { font-size: 18px; color: rgba(255,255,255,0.1); background: none; border: none; cursor: pointer; transition: transform 0.15s ease, color 0.15s ease; padding: 0 2px; }
.star-btn:hover { transform: scale(1.2); }
.star-active { color: #D4A853; }

.comment-input {
  width: 100%; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px; padding: 10px 14px; font-size: 11px; color: #F1F5F9;
  outline: none; resize: none; font-family: inherit;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.comment-input::placeholder { color: #64748B; opacity: 0.6; }
.comment-input:focus { border-color: #D4A853; box-shadow: 0 0 0 3px rgba(212,168,83,0.1); }

.form-actions { display: flex; gap: 8px; }
.btn-cancel { flex: 1; font-size: 10px; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: #64748B; cursor: pointer; transition: all 0.2s ease; }
.btn-cancel:hover { border-color: rgba(255,255,255,0.2); color: #94A3B8; }
.btn-submit { flex: 1; font-size: 10px; font-weight: 700; padding: 8px; border-radius: 8px; border: none; background: #D4A853; color: #08080F; cursor: pointer; transition: all 0.2s ease; }
.btn-submit:hover:not(.btn-submit--disabled) { background: #C49040; box-shadow: 0 4px 12px rgba(212,168,83,0.2); }
.btn-submit--disabled { opacity: 0.4; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  .feedback-card, .write-trigger, .star-btn, .comment-input, .btn-cancel, .btn-submit, .rating-fill { transition: none; }
  .star-btn:hover { transform: none; }
}
</style>
