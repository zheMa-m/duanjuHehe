/**
 * useAppSEO — 统一 SEO 注入入口
 * 
 * 官网 (client) 和营销 H5 页面必须调用此 composable，
 * 确保所有对外页面具有完整的 meta 标签、Open Graph 和结构化数据。
 */
interface SeoOptions {
  title: string
  description: string
  image?: string
  url?: string
  type?: 'website' | 'article'
}

export function useAppSEO(options: SeoOptions) {
  const siteName = 'HEHE'
  const defaultImage = '/og-default.png'

  useSeoMeta({
    title: `${options.title} | ${siteName}`,
    description: options.description,
    ogTitle: `${options.title} | ${siteName}`,
    ogDescription: options.description,
    ogImage: options.image || defaultImage,
    ogType: options.type || 'website',
    ogUrl: options.url,
    twitterCard: 'summary_large_image',
    twitterTitle: `${options.title} | ${siteName}`,
    twitterDescription: options.description,
    twitterImage: options.image || defaultImage,
  })
}
