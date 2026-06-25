<script setup lang="ts">
import { useStarpathStore } from '~/stores/starpath'

const props = defineProps<{
  /** 1..18 */
  index: number
  question: string
  options: string[]
  /** 下一页路径；不传则按 flow 自动推进 */
  nextPath?: string
  /** 已选；外部受控 */
  modelValue?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [v: string]
  picked: [v: string]
}>()

const router = useRouter()
const store = useStarpathStore()
const { progressOf, next: flowNext } = useStarpathFlow()

const route = useRoute()
const selected = ref<string | null>(props.modelValue ?? null)

watch(() => props.modelValue, (v) => { selected.value = v ?? null })

function pick(opt: string) {
  selected.value = opt
  emit('update:modelValue', opt)
  emit('picked', opt)
  store.setQuestion(props.index, opt)

  // 异步提交答案到数据库（fire-and-forget，不阻塞跳转）
  const sid = store.sessionId || `sp_${Date.now()}_${Math.random().toString(36).slice(2)}`
  if (!store.sessionId) store.setSessionId(sid)

  $fetch('/api/starpath/questionnaire/answer', {
    method: 'POST',
    body: {
      sessionId: sid,
      step: props.index,
      questionKey: `q${props.index}`,
      answerValue: opt,
      // 首次提交时附带基础信息（由前序页面存入 store）
      ...(props.index === 1 ? {
        gender: store.answers.gender,
        birthDate: store.answers.birthDate,
        birthTime: store.answers.birthTime,
        birthCity: store.answers.birthCity,
        fullName: store.answers.fullName,
        // Intro 阶段数据（用户画像）
        introAnswers: {
          ...(store.answers.familiarity ? { familiarity: store.answers.familiarity } : {}),
          ...(store.answers.focus?.length ? { focus: store.answers.focus } : {}),
          ...(store.answers.goal ? { goal: store.answers.goal } : {}),
          ...(store.answers.relationship ? { relationship: store.answers.relationship } : {}),
        },
      } : {}),
    },
  }).then((res: any) => {
    // API 返回真实 DB session ID，覆盖本地临时 key
    if (res?.data?.sessionId && res.data.sessionId !== sid) {
      store.setSessionId(res.data.sessionId)
    }
  }).catch((e: any) => {
    console.warn('[Starpath] Answer submit failed, continuing offline', e)
  })

  setTimeout(() => {
    if (props.nextPath) router.push(encodeURI(props.nextPath))
    else flowNext()
  }, 220)
}
</script>

<template>
  <StarpathLayout show-back show-lock :progress="progressOf(route.path)">
    <h1 class="mt-[60px] w-[337px] mx-auto text-center text-base font-semibold leading-[1.3]">
      {{ question }}
    </h1>

    <div class="mt-[60px] flex flex-col gap-[22px] items-center">
      <StarpathOptionCard
        v-for="opt in options"
        :key="opt"
        :selected="selected === opt"
        @click="pick(opt)"
      >
        {{ opt }}
      </StarpathOptionCard>
    </div>
  </StarpathLayout>
</template>
