// @api-auth: public
import { defineEventHandler, getQuery, parseCookies, setCookie, sendRedirect, setHeader } from 'h3'

const COOKIE_NAME = 'site-access'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 天

/**
 * 站点访问密码守卫
 *
 * 仅在 SITE_ACCESS_PASSWORD 配置时激活。未验证用户将被拦截在密码输入页，
 * 输入正确密码后通过 Cookie 放行 30 天。
 * 本地开发（未设置密码）自动跳过。
 */
export default defineEventHandler((event) => {
  const password = useRuntimeConfig().accessPassword as string
  // 未配置密码 → 不启用保护
  if (!password) return

  const path = event.path

  // 静态资源和内部路由跳过保护
  if (
    path.startsWith('/_nuxt/') ||
    path.startsWith('/_openapi') ||
    path.startsWith('/_scalar') ||
    path.startsWith('/_swagger') ||
    path === '/favicon.ico' ||
    path === '/robots.txt' ||
    path.startsWith('/__nuxt')
  ) return

  // 认证相关 API 必须始终可达（否则无法登录）
  if (
    path.startsWith('/api/v1/auth/') ||
    path === '/api/v1/payments/webhook' ||
    path === '/api/v1/payments/confirm'
  ) return

  // 检查 ?password= 查询参数
  const query = getQuery(event)
  if (query.password === password) {
    setCookie(event, COOKIE_NAME, password, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
    // 重定向到清洁 URL（去掉 password 参数）
    const cleanUrl = path.split('?')[0] || '/'
    return sendRedirect(event, cleanUrl, 302)
  }

  // 检查 Cookie
  const cookies = parseCookies(event)
  if (cookies[COOKIE_NAME] === password) return

  // API 请求返回 403 JSON
  if (path.startsWith('/api/')) {
    setHeader(event, 'Content-Type', 'application/json')
    event.node.res.statusCode = 403
    return JSON.stringify({ error: 'Access denied. Site password required.' })
  }

  // 页面请求 → 返回密码输入页
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  event.node.res.statusCode = 401
  return ACCESS_PAGE_HTML
})

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
  // 如果 URL 带错误的 password 参数，显示错误提示
  if (new URLSearchParams(location.search).has('password')) {
    document.getElementById('err').classList.add('show');
    history.replaceState(null, '', location.pathname);
  }
</script>
</body>
</html>`
