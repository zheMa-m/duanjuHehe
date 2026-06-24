import { resolveAdminHref } from '~/utils/subdomain'

/** 管理后台入口 — 生产环境走 admin.{rootDomain} */
export function useAdminUrl() {
  const requestURL = useRequestURL()

  const href = computed(() =>
    resolveAdminHref(`${requestURL.protocol}//${requestURL.host}`),
  )

  return { href }
}
