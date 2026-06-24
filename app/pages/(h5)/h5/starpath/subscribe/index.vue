<script setup lang="ts">
// Auto-redirect based on platform detection
// router.push 前缀由 plugins/01.subdomain-router.client.ts 自动剥离
if (process.client) {
  const router = useRouter()
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)
  if (isIOS) router.push('/h5/starpath/subscribe/ios')
  else if (isAndroid) router.push('/h5/starpath/subscribe/android')
  else router.push('/h5/starpath/subscribe/ios')
}
</script>

<template>
  <div />
</template>
