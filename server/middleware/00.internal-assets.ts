/**
 * 内部资源路径重写 — 子域名 H5 前缀下的 _i18n / _ipx 请求
 *
 * 子域名访问 /h5/{biz}/welcome 时，i18n 懒加载可能请求
 * /h5/{biz}/_i18n/... 而非根路径 /_i18n/...，导致 404。
 * 在路由匹配前将路径重写为根级内部资源路径。
 */
import { defineEventHandler } from 'h3'

const PREFIXED_INTERNAL = /^\/h5\/[^/]+(\/_i18n\/.*|\/_ipx\/.*)$/

export default defineEventHandler((event) => {
  const path = event.path
  const match = path.match(PREFIXED_INTERNAL)
  if (!match?.[1]) return

  event.node.req.url = match[1]
})
