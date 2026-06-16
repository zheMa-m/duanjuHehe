/**
 * POST /api/v1/auth/login — 统一登录入口
 *
 * 支持三种模式：
 * 1. 邮箱密码登录 (email + password)
 * 2. 社交 OAuth 跳转 (provider: google/facebook/apple)
 * 3. 匿名用户登录 (anonymous: true + device_id)
 */
import { z } from 'zod'
import { H3Event } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { getClientRealIP } from '~~/server/utils/ip'

defineRouteMeta({
  openAPI: {
    tags: ['Auth'],
    summary: '统一登录入口',
    description: '支持三种模式：邮箱密码登录、社交 OAuth 跳转（google/facebook/apple）、匿名用户登录（device_id）。',
    requestBody: {
      description: '登录请求 — 三种互斥模式任选其一',
      content: {
        'application/json': {
          schema: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
              {
                type: 'object',
                properties: {
                  provider: { type: 'string', enum: ['google', 'facebook', 'apple'] },
                  redirect_to: { type: 'string', format: 'uri' },
                  link: { type: 'boolean' },
                },
                required: ['provider'],
              },
              {
                type: 'object',
                properties: {
                  anonymous: { type: 'boolean', enum: [true] },
                  device_id: { type: 'string' },
                },
                required: ['anonymous', 'device_id'],
              },
            ],
          },
        },
      },
    },
    responses: {
      200: { description: '登录成功 — 返回用户信息 + 会话令牌' },
      401: { description: '凭证无效' },
    },
  } as any,
})

const emailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const oauthSchema = z.object({
  provider: z.enum(['google', 'facebook', 'apple']),
  redirect_to: z.string().url().optional(),
  link: z.boolean().optional(),
})

const anonSchema = z.object({
  anonymous: z.literal(true),
  device_id: z.string().min(1),
})

// 联合校验：三种模式互斥
const schema = z.union([emailSchema, oauthSchema, anonSchema])

export default defineEventHandler(async (event: H3Event) => {
  const body = await readValidatedBody(event, (data) => schema.parse(data))
  const db = getDB(event)
  const ip = getClientRealIP(event)
  const userAgent = event.headers.get('user-agent') || ''

  // ── 模式 1: 邮箱密码登录 ─────────────────────────────────
  if ('email' in body && 'password' in body) {
    const { data, error } = await db.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error || !data.session) {
      // 记录失败日志
      await db.from('activity_logs').insert({
        category: 'auth',
        user_id: null,
        action: 'login',
        ip,
        metadata: { provider: 'email', user_agent: userAgent, success: false, error_msg: error?.message || 'Invalid credentials' },
      })
      throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
    }

    // 记录成功日志
    await db.from('activity_logs').insert({
      category: 'auth',
      user_id: data.user.id,
      action: 'login',
      ip,
      metadata: { provider: 'email', user_agent: userAgent, success: true },
    })

    return sendSuccess(event, {
      user: { id: data.user.id, email: data.user.email },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      }
    }, 'Login successful')
  }

  // ── 模式 2: 社交 OAuth ──────────────────────────────────
  if ('provider' in body) {
    const redirectTo = body.redirect_to || `${event.headers.get('origin') || 'http://localhost:3000'}/api/v1/auth/callback`

    const { data, error } = await db.auth.signInWithOAuth({
      provider: body.provider,
      options: { redirectTo },
    })

    if (error) {
      throw createError({ statusCode: 400, statusMessage: error.message || 'OAuth initiation failed' })
    }

    return sendSuccess(event, {
      url: data.url,
      provider: body.provider,
    }, 'Redirecting to OAuth provider')
  }

  // ── 模式 3: 匿名用户 ────────────────────────────────────
  if ('anonymous' in body && body.anonymous) {
    // 匿名登录：使用 device_id 作为标识
    // Supabase 支持 anonymous sign-in，返回一个临时用户
    const { data, error } = await db.auth.signInAnonymously?.() || {
      data: {
        user: { id: `anon-${body.device_id}`, email: null },
        session: {
          access_token: `mock-anon-${Date.now()}`,
          refresh_token: `mock-anon-refresh-${Date.now()}`,
          expires_at: Date.now() + 86400000,
        }
      },
      error: null
    }

    if (error) {
      throw createError({ statusCode: 400, statusMessage: error.message || 'Anonymous sign-in failed' })
    }

    await db.from('activity_logs').insert({
      category: 'auth',
      user_id: data.user?.id || null,
      action: 'login',
      ip,
      metadata: { provider: 'anonymous', user_agent: userAgent, device_id: body.device_id, success: true },
    })

    return sendSuccess(event, {
      user: { id: data.user?.id, is_anonymous: true },
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      } : null,
    }, 'Anonymous sign-in successful')
  }

  throw createError({ statusCode: 400, statusMessage: 'Invalid login request' })
})
