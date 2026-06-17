/**
 * 脚本共享工具 — .env 加载 + 颜色输出
 *
 * 用法：
 *   import { loadEnv, c, ok, fail, info, section, counts } from './_shared.mjs'
 *   loadEnv(import.meta.url)  // 传入当前脚本 URL，自动定位项目根 .env
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ─── 颜色常量 ────────────────────────────────────────
export const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
  bold: '\x1b[1m', dim: '\x1b[2m',
}

// ─── 输出助手 ────────────────────────────────────────
let _failCount = 0
let _passCount = 0

export const pass = (msg) => console.log(`  ${c.green}✔${c.reset} ${msg}`)
export const fail = (msg) => { console.log(`  ${c.red}✘${c.reset} ${msg}`); _failCount++ }
export const info = (msg) => console.log(`  ${c.cyan}ℹ${c.reset} ${msg}`)
export const warn = (msg) => console.log(`  ${c.yellow}⚠${c.reset} ${msg}`)
export const ok   = (msg) => { pass(msg); _passCount++ }
export const section = (msg) => console.log(`\n${c.bold}── ${msg} ──${c.reset}`)
export const counts = () => ({ pass: _passCount, fail: _failCount })

// ─── .env 加载 ───────────────────────────────────────
/**
 * 加载项目根目录 .env 到 process.env
 * @param {string} importMetaUrl — 调用脚本的 import.meta.url
 * @returns {string} 项目根目录绝对路径
 */
export function loadEnv(importMetaUrl) {
  const scriptDir = path.dirname(fileURLToPath(importMetaUrl))
  const rootDir = path.resolve(scriptDir, '..')
  const envPath = path.join(rootDir, '.env')

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim()
        const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '')
        process.env[key] = val
      }
    })
    info('已加载 .env 配置')
  } else {
    warn('未找到 .env 文件，使用进程环境变量')
  }

  return rootDir
}
