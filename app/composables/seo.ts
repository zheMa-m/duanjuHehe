/**
 * useAppSEO — 统一 SEO 注入入口
 *
 * 官网 (client) 和营销 H5 页面必须调用此 composable，
 * 确保所有对外页面具有完整的 meta 标签、Open Graph 和结构化数据。
 *
 * 支持响应式参数：title / description 等字段接受 MaybeRefOrGetter，
 * 切换语言时 SEO meta 自动刷新。
 */
interface SeoOptions {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  image?: MaybeRefOrGetter<string>
  url?: MaybeRefOrGetter<string>
  type?: 'website' | 'article'
}

export function useAppSEO(options: SeoOptions) {
  const siteName = 'HEHE'
  const defaultImage = '/og-default.png'

  const title = computed(() => `${toValue(options.title)} | ${siteName}`)
  const desc = computed(() => toValue(options.description))
  const image = computed(() => toValue(options.image) || defaultImage)
  const url = computed(() => toValue(options.url) || undefined)

  useSeoMeta({
    title,
    description: desc,
    ogTitle: title,
    ogDescription: desc,
    ogImage: image,
    ogType: options.type || 'website',
    ogUrl: url,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: desc,
    twitterImage: image,
  })
}
