<script setup lang="ts">
// Redirect /starpath → /h5/starpath/welcome
// navigateTo 带 redirectCode 走 HTTP 重定向，不经过 router.push，
// 因此需手动剥离子域名前缀：starpath.aihomeworkscan.com/ → /welcome
import { parseSubdomain, getPrefix, stripPrefix } from '~/utils/subdomain'

const target = '/h5/starpath/welcome'

let hostname = ''
if (import.meta.server) {
  try {
    hostname = (useRequestHeaders(['host']).host || '').split(':')[0] || ''
  } catch { /* ignore */ }
} else {
  hostname = window.location.hostname
}

const { subdomain } = parseSubdomain(hostname)
const prefix = getPrefix(subdomain)
const finalTarget = prefix ? stripPrefix(target, prefix) : target

await navigateTo(finalTarget, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
