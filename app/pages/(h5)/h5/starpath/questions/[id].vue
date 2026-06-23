<script setup lang="ts">
import { getQuestionOptions } from '~/utils/starpath-questions'

const { t, locale } = useI18n()
definePageMeta({
  title: '智能问卷 · Questions',
  alias: '/h5/starpath/问卷页面-问题:id',
})
useHead({ title: 'Question · 智能问卷' })

const route = useRoute()

const id = computed(() => Number(route.params.id))

const question = computed(() => t(`starpath.questions.q${id.value}`))

const options = computed(() => getQuestionOptions(id.value, locale.value as 'zh' | 'en'))

const nextPath = computed(() => {
  if (id.value >= 18) return '/h5/starpath/loading'
  return `/h5/starpath/questions/${id.value + 1}`
})
</script>

<template>
  <StarpathQuestionListPage
    :index="id"
    :question="question"
    :options="options"
    :next-path="nextPath"
  />
</template>
