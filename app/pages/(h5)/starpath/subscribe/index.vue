<script setup lang="ts">
// Auto-redirect based on platform detection
if (process.client) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)
  if (isIOS) navigateTo('/starpath/subscribe/ios', { redirectCode: 302 })
  else if (isAndroid) navigateTo('/starpath/subscribe/android', { redirectCode: 302 })
  else navigateTo('/starpath/subscribe/ios', { redirectCode: 302 })
}
</script>

<template>
  <div />
</template>
