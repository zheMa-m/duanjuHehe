<script setup lang="ts">
// 订阅页已废弃，统一重定向到一次性购买页
// router.push 前缀由 plugins/01.subdomain-router.client.ts 自动剥离
if (process.client) {
  const router = useRouter()
  router.replace('/h5/starpath/purchase')
}
</script>

<template>
  <div />
</template>
