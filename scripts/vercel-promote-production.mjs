#!/usr/bin/env node
/**
 * 将生产自定义域名别名切换到最新 Production 部署。
 *
 * 解决 Git push 后 Vercel 产生新 Production 部署，但 starpath.* 等域名
 * 仍指向旧 deployment 的问题。
 *
 * 用法：
 *   VERCEL_TOKEN=xxx node scripts/vercel-promote-production.mjs
 *   GITHUB_SHA=abc123 VERCEL_TOKEN=xxx node scripts/vercel-promote-production.mjs
 *
 * 环境变量：
 *   VERCEL_TOKEN      — 必填（Vercel Account Token）
 *   GITHUB_SHA        — 可选，等待该 commit 的部署 READY 后再 promote
 *   PRODUCTION_DOMAIN — 可选，用于校验别名（默认 www.aihomeworkscan.com）
 *   VERCEL_PROJECT    — 可选，项目名（默认 hehe-app）
 */
import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { fail, info, ok, section, warn } from './_shared.mjs'

const execFileAsync = promisify(execFile)
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TOKEN = process.env.VERCEL_TOKEN
const TARGET_SHA = process.env.GITHUB_SHA || ''
const CHECK_DOMAIN = process.env.PRODUCTION_DOMAIN || 'www.aihomeworkscan.com'
const PROJECT = process.env.VERCEL_PROJECT || 'hehe-app'
const POLL_INTERVAL_MS = 15_000
const MAX_WAIT_MS = 10 * 60_000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 解析 vercel CLI JSON 输出（跳过前置日志行） */
function parseVercelJson(stdout) {
  const start = stdout.indexOf('{')
  if (start === -1) throw new Error(`Invalid Vercel CLI output:\n${stdout}`)
  return JSON.parse(stdout.slice(start))
}

async function vercelCli(args) {
  const { stdout } = await execFileAsync('npx', ['vercel', ...args, '--token', TOKEN], {
    cwd: ROOT_DIR,
    maxBuffer: 10 * 1024 * 1024,
  })
  return stdout
}

async function listProductionDeployments() {
  const stdout = await vercelCli(['list', PROJECT, '--prod', '--format', 'json'])
  const data = parseVercelJson(stdout)
  return data.deployments ?? []
}

async function listAliases() {
  const stdout = await vercelCli(['alias', 'ls', '--format', 'json'])
  const data = parseVercelJson(stdout)
  return data.aliases ?? []
}

async function promoteDeployment(deploymentUrl) {
  const url = deploymentUrl.startsWith('https://') ? deploymentUrl : `https://${deploymentUrl}`
  await vercelCli(['promote', url, '--yes'])
}

async function waitForTargetDeployment() {
  const started = Date.now()
  while (Date.now() - started < MAX_WAIT_MS) {
    const deployments = await listProductionDeployments()
    const candidate = TARGET_SHA
      ? deployments.find((d) => d.meta?.githubCommitSha === TARGET_SHA)
      : deployments[0]

    if (candidate?.state === 'READY' && candidate.url) {
      return candidate
    }

    const state = candidate?.state ?? 'not found'
    info(`等待部署 READY（sha=${TARGET_SHA || 'latest'}, state=${state}）…`)
    await sleep(POLL_INTERVAL_MS)
  }
  throw new Error(`超时：${MAX_WAIT_MS / 1000}s 内未找到 READY 的 Production 部署`)
}

async function main() {
  section('Vercel Production Promote')

  if (!TOKEN) {
    fail('缺少 VERCEL_TOKEN 环境变量')
    process.exit(1)
  }

  const deployment = await waitForTargetDeployment()
  info(`目标部署: ${deployment.url} (${deployment.meta?.githubCommitSha?.slice(0, 7) ?? 'no-sha'})`)

  const aliases = await listAliases()
  const domainAlias = aliases.find((a) => a.alias === CHECK_DOMAIN)
  if (!domainAlias) {
    warn(`未找到 ${CHECK_DOMAIN} 的别名记录，仍将执行 promote`)
  } else if (domainAlias.url === deployment.url) {
    ok(`别名已指向最新部署 (${CHECK_DOMAIN} → ${deployment.url})`)
    return
  } else {
    info(`别名漂移: ${CHECK_DOMAIN} → ${domainAlias.url}，将切换到 ${deployment.url}`)
  }

  await promoteDeployment(deployment.url)
  ok(`已 promote: ${deployment.url}`)

  const after = await listAliases()
  const verified = after.find((a) => a.alias === CHECK_DOMAIN)
  if (verified && verified.url !== deployment.url) {
    fail(`promote 后别名仍未对齐: ${verified.url}`)
    process.exit(1)
  }
  ok('生产域名别名校验通过')
}

main().catch((err) => {
  fail(err.message || String(err))
  process.exit(1)
})
