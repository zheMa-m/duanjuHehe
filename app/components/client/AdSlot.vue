<script setup lang="ts">
/**
 * AdSlot — 通用广告位渲染组件
 *
 * 用法: <ClientAdSlot position="header_banner" :subdomain="subdomain" />
 *
 * 支持 4 种广告位形态:
 * - header_banner: 顶部横幅
 * - footer_banner: 底部横幅
 * - native_inline: 原生内嵌
 * - interstitial: 插屏广告
 */
interface Props {
  position: 'header_banner' | 'footer_banner' | 'native_inline' | 'interstitial'
  subdomain?: string
}

const props = withDefaults(defineProps<Props>(), {
  subdomain: undefined,
})

const { slots, fetchSlots, trackImpression, trackClick } = useAdSlot(props.position, props.subdomain)

/**
 * 简易 HTML 消毒：移除 script/style/iframe/object/embed 标签及 on* 事件属性
 * 防止 XSS 注入，仅保留安全的展示型 HTML
 */
function sanitizeHtml(html: string): string {
  const dangerous = /(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<iframe[\s\S]*?<\/iframe>|<object[\s\S]*?<\/object>|<embed[\s\S]*?<\/embed>|<link[\s\S]*?>)/gi
  const onEvents = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi
  const javascript = /javascript\s*:/gi
  return html.replace(dangerous, '').replace(onEvents, '').replace(javascript, '')
}

onMounted(async () => {
  await fetchSlots()
  // 组件挂载后自动上报展示事件
  for (const slot of slots.value) {
    await trackImpression(slot.id, props.subdomain)
  }
})

const handleClick = (slot: any) => {
  trackClick(slot.id, props.subdomain)
}

// 根据 position 计算容器样式
const containerClass = computed(() => {
  const base = 'ad-slot-container'
  switch (props.position) {
    case 'header_banner': return `${base} ad-banner`
    case 'footer_banner': return `${base} ad-banner`
    case 'native_inline': return `${base} ad-native`
    case 'interstitial': return `${base} ad-interstitial`
    default: return base
  }
})
</script>

<template>
  <div v-if="slots.length > 0" :class="containerClass">
    <div
      v-for="slot in slots"
      :key="slot.id"
      class="ad-slot-item"
      @click="handleClick(slot)"
    >
      <!-- AdSense 模式 -->
      <div v-if="slot.ad_provider === 'adsense'" class="ad-adsense">
        <ins
          class="adsbygoogle"
          :data-ad-client="slot.ad_config['data-ad-client']"
          :data-ad-slot="slot.ad_config['data-ad-slot']"
          style="display:block"
        ></ins>
      </div>

      <!-- Custom HTML 模式（已消毒） -->
      <div
        v-else-if="slot.ad_provider === 'custom' && slot.ad_config.html"
        class="ad-custom"
        v-html="sanitizeHtml(slot.ad_config.html)"
      ></div>

      <!-- 占位模式（无配置时显示标签） -->
      <div v-else class="ad-placeholder">
        <span class="ad-label">Ad</span>
        <span class="ad-name">{{ slot.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ad-slot-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ad-banner {
  text-align: center;
  padding: 8px 0;
}

.ad-native {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.ad-interstitial {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
}

.ad-slot-item {
  cursor: pointer;
  transition: opacity 0.2s;
}

.ad-slot-item:hover {
  opacity: 0.9;
}

.ad-placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
}

.ad-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
}

.ad-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
}

.ad-custom {
  overflow: hidden;
}

.ad-adsense {
  min-height: 90px;
}
</style>
