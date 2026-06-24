<script setup lang="ts">
// {subdomain}.aihomeworkscan.com/ → 301 → /welcome
// navigateTo 带 redirectCode 走 HTTP 重定向，不经过 router.push，需手动剥离前缀
import { parseSubdomain, getPrefix, stripPrefix } from '~/utils/subdomain'

const hostname = import.meta.server
  ? (useRequestHeaders(['host']).host || '').split(':')[0] || ''
  : window.location.hostname

const { subdomain } = parseSubdomain(hostname)
const prefix = getPrefix(subdomain)
// 动态构建子域名完整路径：/h5/{子域名}/welcome → 剥离前缀 → /welcome
const fullPath = prefix ? `${prefix}/welcome` : '/welcome'
const target = prefix ? stripPrefix(fullPath, prefix) : fullPath

await navigateTo(target, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
