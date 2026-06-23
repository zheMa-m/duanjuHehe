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
