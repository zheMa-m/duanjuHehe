<script setup lang="ts">
/**
 * SocialShare — 通用社交分享组件
 *
 * 支持 WhatsApp / Facebook / Twitter(X) / Telegram / 微信(二维码) / 复制链接
 * 纯前端实现，零后端依赖。分享点击可选上报到 ad_events 做转化追踪。
 */

const props = withDefaults(defineProps<{
  /** 分享标题 */
  title?: string
  /** 分享描述 */
  description?: string
  /** 分享 URL（默认当前页面） */
  url?: string
  /** 分享图片 URL */
  image?: string
  /** 营销活动子域名（用于事件追踪） */
  subdomain?: string
  /** 展示的分享平台列表 */
  platforms?: Array<'whatsapp' | 'facebook' | 'twitter' | 'telegram' | 'wechat' | 'copy'>
  /** 展示风格 */
  variant?: 'icons' | 'buttons'
  /** 图标尺寸 */
  size?: 'sm' | 'md'
}>(), {
  title: '',
  description: '',
  url: '',
  image: '',
  subdomain: '',
  platforms: () => ['whatsapp', 'facebook', 'twitter', 'telegram', 'wechat', 'copy'],
  variant: 'icons',
  size: 'md',
})

const emit = defineEmits<{
  (e: 'share', platform: string): void
}>()

const { t } = useI18n()

const showQrCode = ref(false)
const copySuccess = ref(false)

/** 实际分享 URL */
const shareUrl = computed(() => {
  if (props.url) return props.url
  if (import.meta.client) return window.location.href
  return ''
})

/** 编码后的分享参数 */
const encoded = computed(() => ({
  url: encodeURIComponent(shareUrl.value),
  title: encodeURIComponent(props.title || document?.title || ''),
  description: encodeURIComponent(props.description || ''),
}))

/** 平台配置 */
const platformConfig: Record<string, { label: string; color: string; icon: string }> = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: 'whatsapp' },
  facebook: { label: 'Facebook', color: '#1877F2', icon: 'facebook' },
  twitter: { label: 'X / Twitter', color: '#000000', icon: 'twitter' },
  telegram: { label: 'Telegram', color: '#0088CC', icon: 'telegram' },
  wechat: { label: 'WeChat', color: '#07C160', icon: 'wechat' },
  copy: { label: 'Copy Link', color: '#6B7280', icon: 'copy' },
}

/** 本地化平台名称 */
const localizedLabels = computed(() => ({
  wechat: t('share.wechat'),
  copy: t('share.copyLink'),
}))

/** 生成分享链接 */
const getShareLink = (platform: string): string => {
  const { url, title, description } = encoded.value
  switch (platform) {
    case 'whatsapp':
      return `https://wa.me/?text=${title}%20${url}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${url}`
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${title}&url=${url}`
    case 'telegram':
      return `https://t.me/share/url?url=${url}&text=${title}`
    default:
      return '#'
  }
}

/** 处理分享点击 */
const handleShare = async (platform: string) => {
  emit('share', platform)

  if (platform === 'copy') {
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      copySuccess.value = true
      setTimeout(() => { copySuccess.value = false }, 2000)
    } catch {
      // fallback
      const input = document.createElement('input')
      input.value = shareUrl.value
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      copySuccess.value = true
      setTimeout(() => { copySuccess.value = false }, 2000)
    }
    return
  }

  if (platform === 'wechat') {
    showQrCode.value = !showQrCode.value
    return
  }

  // 其他平台：打开新窗口
  const link = getShareLink(platform)
  window.open(link, '_blank', 'width=600,height=400,noopener,noreferrer')
}

const iconSize = computed(() => props.size === 'sm' ? 'w-8 h-8' : 'w-10 h-10')
const iconInner = computed(() => props.size === 'sm' ? 'w-4 h-4' : 'w-5 h-5')
</script>

<template>
  <div class="social-share">
    <!-- Icons 模式 -->
    <div v-if="variant === 'icons'" class="flex items-center gap-2">
      <button
        v-for="p in platforms"
        :key="p"
        @click="handleShare(p)"
        :title="(p === 'wechat' || p === 'copy') ? localizedLabels[p as 'wechat' | 'copy'] : (platformConfig[p]?.label || p)"
        class="relative group transition-all duration-200 hover:scale-110 active:scale-95"
        :class="iconSize"
      >
        <span
          class="absolute inset-0 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"
          :style="{ backgroundColor: platformConfig[p]?.color || '#666' }"
        />

        <!-- WhatsApp -->
        <svg v-if="p === 'whatsapp'" :class="iconInner" class="relative z-10 mx-auto" viewBox="0 0 24 24" fill="currentColor" :style="{ color: platformConfig.whatsapp?.color }">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>

        <!-- Facebook -->
        <svg v-else-if="p === 'facebook'" :class="iconInner" class="relative z-10 mx-auto" viewBox="0 0 24 24" fill="currentColor" :style="{ color: platformConfig.facebook?.color }">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>

        <!-- Twitter/X -->
        <svg v-else-if="p === 'twitter'" :class="iconInner" class="relative z-10 mx-auto" viewBox="0 0 24 24" fill="currentColor" style="color: #fff">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>

        <!-- Telegram -->
        <svg v-else-if="p === 'telegram'" :class="iconInner" class="relative z-10 mx-auto" viewBox="0 0 24 24" fill="currentColor" :style="{ color: platformConfig.telegram?.color }">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>

        <!-- WeChat -->
        <svg v-else-if="p === 'wechat'" :class="iconInner" class="relative z-10 mx-auto" viewBox="0 0 24 24" fill="currentColor" :style="{ color: platformConfig.wechat?.color }">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.397 2.929c-1.877-.014-3.853.577-5.231 1.744-1.584 1.34-2.373 3.264-1.695 5.278.644 1.91 2.38 3.186 4.58 3.671a8.827 8.827 0 0 0 2.282.298c.394 0 .787-.042 1.17-.113a.7.7 0 0 1 .576.08l1.413.825a.258.258 0 0 0 .132.044.232.232 0 0 0 .233-.236c0-.058-.024-.115-.04-.17l-.286-1.093a.472.472 0 0 1 .17-.533C19.72 17.13 21 15.404 21 13.422c0-2.905-2.632-4.502-6.005-4.502zm-1.834 2.89c.517 0 .936.425.936.95s-.42.95-.936.95a.943.943 0 0 1-.935-.95c0-.525.42-.95.935-.95zm4.218 0c.517 0 .935.425.935.95s-.418.95-.935.95a.943.943 0 0 1-.936-.95c0-.525.42-.95.936-.95z"/>
        </svg>

        <!-- Copy -->
        <svg v-else-if="p === 'copy'" :class="iconInner" class="relative z-10 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :style="{ color: copySuccess ? '#10B981' : '#9CA3AF' }">
          <path v-if="!copySuccess" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke-linecap="round" stroke-linejoin="round"/>
          <path v-if="!copySuccess" d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke-linecap="round" stroke-linejoin="round"/>
          <path v-if="copySuccess" d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Buttons 模式 -->
    <div v-else class="grid grid-cols-3 gap-2">
      <button
        v-for="p in platforms"
        :key="p"
        @click="handleShare(p)"
        class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-medium text-white transition-all hover:opacity-90 active:scale-95"
        :style="{ backgroundColor: platformConfig[p]?.color || '#666' }"
      >
        {{ copySuccess && p === 'copy' ? t('share.copied') : ((p === 'wechat' || p === 'copy') ? localizedLabels[p as 'wechat' | 'copy'] : (platformConfig[p]?.label || p)) }}
      </button>
    </div>

    <!-- 微信二维码弹窗 -->
    <div v-if="showQrCode" class="mt-3 p-4 bg-white rounded-xl text-center" @click.stop>
      <p class="text-xs text-gray-600 mb-2">{{ t('share.scanQrCode') }}</p>
      <img
        :src="`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded.url}`"
        alt="微信分享二维码"
        class="mx-auto w-32 h-32"
        loading="lazy"
      />
      <button
        @click="showQrCode = false"
        class="mt-2 text-[10px] text-gray-400 hover:text-gray-600"
      >
        {{ t('share.close') }}
      </button>
    </div>
  </div>
</template>
