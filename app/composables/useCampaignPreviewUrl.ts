import { resolveCampaignPreviewHref } from '~/utils/subdomain'

/** 营销活动 H5 预览链接（本地完整路径，生产子域名） */
export function useCampaignPreviewUrl(subdomain: string) {
  const requestURL = useRequestURL()

  const href = computed(() =>
    resolveCampaignPreviewHref(subdomain, `${requestURL.protocol}//${requestURL.host}`),
  )

  return { href }
}
