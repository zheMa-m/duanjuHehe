<script setup lang="ts">
// {subdomain}.aihomeworkscan.com/ → /welcome（子域名内路径）
// localhost / www → /h5/starpath/welcome
import { getCampaignLocalPath, getPrefix, parseSubdomain, stripPrefix } from '~/utils/subdomain'

const hostname = import.meta.server
  ? (useRequestHeaders(['host']).host || '').split(':')[0] || ''
  : window.location.hostname

const { subdomain } = parseSubdomain(hostname)
const prefix = getPrefix(subdomain)

const target = prefix
  ? stripPrefix(`${prefix}/welcome`, prefix)
  : getCampaignLocalPath('starpath')

await navigateTo(target, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
