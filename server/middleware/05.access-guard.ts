/**
 * 站点访问密码守卫（统一页面 + OpenAPI 文档保护）
 *
 * 仅在 SITE_ACCESS_PASSWORD 配置且非本地开发环境时激活。
 * 本地开发（MOCK_DB=true 或 NODE_ENV=development）自动跳过。
 *
 * 认证方式：
 *   页面访问 → ?password=<密码> → 设置 Cookie → 30 天免登
 *   API/OpenAPI → ?token=<密码> | ?password=<密码> | Bearer <密码> | Cookie
 *
 * 认证流程：
 *   1. 检查 Cookie（已登录直接放行）
 *   2. 检查 Query/Bearer 认证参数
 *   3. 认证成功 → 设置 Cookie 并放行
 *   4. 认证失败 → 页面请求显示密码输入页，API/OpenAPI 返回 JSON 错误
 */
// @api-auth: public
import { defineEventHandler, getQuery, parseCookies, setCookie, sendRedirect, setHeader, createError } from 'h3'

const COOKIE_NAME = 'site-access'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 天
const OPENAPI_PREFIXES = ['/_openapi', '/_scalar', '/_swagger']

// ── 辅助：是否为 OpenAPI 文档路径 ──
const isOpenApiPath = (path: string) =>
  OPENAPI_PREFIXES.some(p => path === p || path.startsWith(p + '?') || path.startsWith(p + '/'))

// ── 辅助：是否为 API/OpenAPI 路径（返回 JSON 错误而非 HTML 密码页） ──
const isApiOrOpenApiPath = (path: string) =>
  path.startsWith('/api/') || isOpenApiPath(path)

export default defineEventHandler((event) => {
  const password = useRuntimeConfig().accessPassword as string

  // 未配置密码 → 不启用保护
  if (!password) return

  // 本地开发环境自动跳过
  if (process.env.NODE_ENV === 'development' || process.env.MOCK_DB === 'true') return

  const path = event.path

  // ── 静态资源和内部路由跳过保护 ──
  if (
    path.startsWith('/_nuxt/') ||
    path === '/favicon.ico' ||
    path === '/robots.txt' ||
    path.startsWith('/__nuxt')
  ) return

  // ── 认证相关 API 必须始终可达 ──
  if (
    path.startsWith('/api/v1/auth/') ||
    path === '/api/v1/payments/webhook' ||
    path === '/api/v1/payments/confirm'
  ) return

  // ── 1. 检查 Cookie ──
  const cookies = parseCookies(event)
  if (cookies[COOKIE_NAME] === password) return

  // ── 2. Query 参数认证 ──
  const query = getQuery(event)
  if (query.password === password || query.token === password) {
    setCookie(event, COOKIE_NAME, password, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
    // 页面请求 → 重定向到清洁 URL（去掉 password 参数）
    if (!isApiOrOpenApiPath(path)) {
      const cleanUrl = path.split('?')[0] || '/'
      return sendRedirect(event, cleanUrl, 302)
    }
    return
  }

  // ── 3. Bearer Header 认证（OpenAPI 机器友好） ──
  const authHeader = event.headers.get('authorization') || ''
  if (authHeader === `Bearer ${password}`) {
    setCookie(event, COOKIE_NAME, password, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
    return
  }

  // ── 4. 认证失败 ──
  if (isApiOrOpenApiPath(path)) {
    // API / OpenAPI 路径 → JSON 错误
    throw createError({
      statusCode: 401,
      statusMessage: 'Access denied. Use ?token=<password>, ?password=<password>, or Bearer <password> to authenticate.',
    })
  }

  // 页面请求 → 密码输入页
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  event.node.res.statusCode = 401
  return ACCESS_PAGE_HTML
})

// ── 密码输入页 HTML ──
const ACCESS_PAGE_HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Access Required</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0e1a;
    color: #e2e8f0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif;
  }
  .card {
    background: #131d35;
    border: 1px solid #1e2d4d;
    border-radius: 16px;
    padding: 48px 40px;
    max-width: 380px;
    width: 100%;
    text-align: center;
  }
  .logo { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
  .logo span { color: #4f8ef7; }
  .subtitle { color: #64748b; font-size: 14px; margin-bottom: 32px; }
  form { display: flex; flex-direction: column; gap: 16px; }
  input[type="password"] {
    width: 100%;
    padding: 12px 16px;
    background: #0a0e1a;
    border: 1px solid #1e2d4d;
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  input[type="password"]:focus { border-color: #4f8ef7; }
  input[type="password"]::placeholder { color: #475569; }
  button {
    width: 100%;
    padding: 12px;
    background: #4f8ef7;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  button:hover { background: #3b7ae0; }
  .error { color: #ef4444; font-size: 13px; display: none; }
  .error.show { display: block; }
</style>
</head>
<body>
<div class="card">
  <p class="subtitle">此站点仅限内部访问，请输入访问密码</p>
  <form id="f" method="get">
    <input type="password" name="password" id="pw" placeholder="Access Password" autofocus autocomplete="off" required>
    <p class="error" id="err">密码错误，请重试</p>
    <button type="submit">进入站点</button>
  </form>
</div>
<script>
  if (new URLSearchParams(location.search).has('password')) {
    document.getElementById('err').classList.add('show');
    history.replaceState(null, '', location.pathname);
  }
</script>
</body>
</html>`
