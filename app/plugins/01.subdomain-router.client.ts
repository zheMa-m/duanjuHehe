/**
 * 子域名路由客户端插件 — 全局自动拦截 push/replace
 *
 * 在子域名环境下自动剥离路径前缀，页面代码中只需写完整路径
 * 如 router.push('/h5/starpath/intro/focus')，插件自动转为 push('/intro/focus')
 *
 * 任何新增页面无需手动处理前缀剥离。
 *
 * 注意：navigateTo 走 Nuxt 内部机制，不受此插件影响；
 * 少数需 navigateTo 的场景请在调用处使用 stripPrefix() 手动处理。
 */
import { parseSubdomain, getPrefix, stripPrefix } from '~/utils/subdomain'

export default defineNuxtPlugin({
  name: 'subdomain-router',
  enforce: 'pre', // 确保在其他插件之前执行
  setup() {
    const hostname = window.location.hostname
    const { subdomain, isLocal } = parseSubdomain(hostname)
    if (isLocal || !subdomain) return

    const prefix = getPrefix(subdomain)
    if (!prefix) return

    const router = useRouter()

    // 包装 push
    const _push = router.push.bind(router)
    router.push = function (to: any) {
      if (typeof to === 'string') {
        to = stripPrefix(to, prefix)
      }
      return _push(to)
    } as typeof router.push

    // 包装 replace
    const _replace = router.replace.bind(router)
    router.replace = function (to: any) {
      if (typeof to === 'string') {
        to = stripPrefix(to, prefix)
      }
      return _replace(to)
    } as typeof router.replace
  },
})
