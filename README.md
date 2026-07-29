# ReelShort

短视频平台，基于 Nuxt 4 + Supabase + Vercel。

## 快速开始

```bash
npm install
npm run dev        # Mock DB 模式，无需数据库
```

浏览器打开 `http://localhost:3000`。

## 部署

推送 GitHub 后 Vercel 自动部署，需设置环境变量：

```
MOCK_DB=false
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
```

视频和缩略图托管在 Supabase Storage，运行 `node scripts/seed-video-content.mjs` 初始化内容。
