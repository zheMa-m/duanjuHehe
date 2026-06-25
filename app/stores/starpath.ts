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

export const useStarpathStore = defineStore('starpath', () => {
  const answers = ref<QuestionnaireAnswers>({ questions: {} })
  const contact = ref<UserContact>({ agreedTerms: false })
  const subscription = ref<SubscriptionState>({ paid: false })
  const purchase = ref<PurchaseState>({ purchased: false })
  /** 问卷 session ID（由 answer API 首次返回后保存，后续所有 API 调用复用） */
  const sessionId = ref<string>('')

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
