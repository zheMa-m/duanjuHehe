import { defineStore } from 'pinia'

interface QuestionnaireAnswers {
  gender?: 'male' | 'female'
  familiarity?: string
  focus?: string[]
  goal?: string
  relationship?: string
  birthDate?: string
  birthTime?: string
  birthCity?: string
  fullName?: string
  /** 18 个深入问题的答案：key 为 'q1'..'q18' */
  questions: Record<string, string>
}

interface UserContact {
  email?: string
  agreedTerms: boolean
}

interface SubscriptionState {
  platform?: 'ios' | 'android'
  plan?: 'trial-7d' | 'monthly'
  paid: boolean
}

interface PurchaseState {
  purchased: boolean
  orderId?: string
  plan?: string
}

const STORAGE_KEY = 'starpath-store'

/** 从 localStorage 恢复关键状态（SSR 安全） */
function hydrate(): Partial<{ sessionId: string; purchase: PurchaseState; answers: QuestionnaireAnswers }> {
  if (import.meta.server) return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* 损坏则忽略 */ }
  return {}
}

export const useStarpathStore = defineStore('starpath', () => {
  const saved = hydrate()

  const answers = ref<QuestionnaireAnswers>(saved.answers ?? { questions: {} })
  const contact = ref<UserContact>({ agreedTerms: false })
  const subscription = ref<SubscriptionState>({ paid: false })
  const purchase = ref<PurchaseState>(saved.purchase ?? { purchased: false })
  /** 问卷 session ID（由 answer API 首次返回后保存，后续所有 API 调用复用） */
  const sessionId = ref<string>(saved.sessionId ?? '')

  // ── 持久化：每次关键状态变化时写入 localStorage ──
  if (import.meta.client) {
    watch(
      [sessionId, purchase, answers],
      () => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            sessionId: sessionId.value,
            purchase: purchase.value,
            answers: answers.value,
          }))
        } catch { /* quota exceeded 等异常静默处理 */ }
      },
      { deep: true },
    )
  }

  function setAnswer<K extends keyof QuestionnaireAnswers>(key: K, value: QuestionnaireAnswers[K]) {
    answers.value[key] = value
  }

  function setQuestion(idx: number, value: string) {
    answers.value.questions[`q${idx}`] = value
  }

  function setEmail(email: string, agreedTerms: boolean) {
    contact.value = { email, agreedTerms }
  }

  function setSubscription(state: Partial<SubscriptionState>) {
    subscription.value = { ...subscription.value, ...state }
  }

  function setPurchase(state: Partial<PurchaseState>) {
    purchase.value = { ...purchase.value, ...state }
  }

  function setSessionId(id: string) {
    sessionId.value = id
  }

  function reset() {
    answers.value = { questions: {} }
    contact.value = { agreedTerms: false }
    subscription.value = { paid: false }
    purchase.value = { purchased: false }
    sessionId.value = ''
    if (import.meta.client) {
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
    }
  }

  return {
    answers,
    contact,
    subscription,
    purchase,
    sessionId,
    setAnswer,
    setQuestion,
    setEmail,
    setSubscription,
    setPurchase,
    setSessionId,
    reset,
  }
})
