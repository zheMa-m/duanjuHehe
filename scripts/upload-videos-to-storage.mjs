/**
 * 视频上传到 Supabase Storage 脚本
 *
 * 将视频文件批量上传到 Supabase Storage 的 series-videos bucket。
 * 支持断点续传（已存在的文件跳过）。
 *
 * 前提：
 *   - .env 中 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 已配置
 *   - Supabase 中已创建 series-videos bucket（public）
 *
 * 运行：
 *   node scripts/upload-videos-to-storage.mjs                    # 上传全部
 *   node scripts/upload-videos-to-storage.mjs --dry-run           # 仅预览不上传
 *   node scripts/upload-videos-to-storage.mjs --limit 20          # 限制数量
 *   node scripts/upload-videos-to-storage.mjs --source <dir>      # 指定源目录
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createHash } from 'node:crypto'

// ─── 配置 ────────────────────────────────────────────────
const SOURCE_DIR = process.argv.find(a => a.startsWith('--source='))?.split('=')[1]
  || join(process.cwd(), 'public/videos/samples')
const BUCKET = 'series-videos'
const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0') || Infinity
const OUTPUT_URLS_FILE = 'scripts/video-urls.json'

// 上传配置：跳过超过此大小的文件（需要先压缩）
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024 // 50 MB
const CONCURRENCY = 3 // 并发上传数

function loadEnv() {
  // 简单的 .env 解析
  try {
    const envPath = join(process.cwd(), '.env')
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq > 0) {
          const key = trimmed.substring(0, eq).trim()
          const val = trimmed.substring(eq + 1).trim()
          if (!process.env[key]) process.env[key] = val
        }
      }
    }
  } catch (_) {}
}

loadEnv()

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('❌ SUPABASE_URL 未配置，请检查 .env')
  process.exit(1)
}
if (!serviceRoleKey || serviceRoleKey.includes('placeholder')) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 未配置，请检查 .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── 工具函数 ─────────────────────────────────────────────
function findFiles(dir, ext = '.mp4') {
  const results = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findFiles(fullPath, ext))
      } else if (entry.name.toLowerCase().endsWith(ext)) {
        results.push({ path: fullPath, size: statSync(fullPath).size, name: entry.name })
      }
    }
  } catch (_) {}
  return results
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getStoragePath(file, folder) {
  // 生成安全的存储路径
  const safeName = basename(file.name, '.mp4')
    .replace(/[<>:"/\\|?*#\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
  const hash = createHash('md5').update(file.path).digest('hex').substring(0, 8)
  return `${folder}/${hash}_${safeName}.mp4`
}

// ─── 主流程 ───────────────────────────────────────────────
console.log('═══════════════════════════════════════════════')
console.log('  视频上传到 Supabase Storage')
console.log('═══════════════════════════════════════════════')
console.log(`  Bucket: ${BUCKET}`)
console.log(`  源目录: ${SOURCE_DIR}`)
console.log(`  模式:   ${DRY_RUN ? '预览 (dry-run)' : '上传'}`)
console.log()

// 扫描文件
console.log('扫描源视频...')
const allFiles = findFiles(SOURCE_DIR)
console.log(`找到 ${allFiles.length} 个视频文件`)

// 按目录分组
const grouped = {}
for (const file of allFiles) {
  const relPath = file.path.replace(SOURCE_DIR, '').replace(/^[/\\]+/, '')
  let folder = 'other'
  if (relPath.startsWith('视频作品')) folder = 'dance-collection'
  else if (relPath.startsWith('单作品解析')) folder = 'dance-analysis'
  else if (relPath.startsWith('主页作品')) folder = 'homepage-works'
  if (!grouped[folder]) grouped[folder] = []
  grouped[folder].push(file)
}

console.log('\n分组统计:')
for (const [folder, files] of Object.entries(grouped)) {
  const totalSize = files.reduce((s, f) => s + f.size, 0)
  console.log(`  ${folder}: ${files.length} 个文件, ${formatSize(totalSize)}`)
}

// 过滤超大文件
console.log(`\n过滤: 跳过 > ${formatSize(MAX_UPLOAD_SIZE)} 的文件`)
const toUpload = []
const skipped = []
for (const [folder, files] of Object.entries(grouped)) {
  for (const file of files) {
    if (file.size <= MAX_UPLOAD_SIZE) {
      toUpload.push({ ...file, folder })
    } else {
      skipped.push({ ...file, folder })
    }
  }
}
console.log(`  可上传: ${toUpload.length} 个`)
console.log(`  需压缩: ${skipped.length} 个（太大，请先运行 compress-videos.mjs）`)

if (skipped.length > 0) {
  console.log('\n需压缩的文件:')
  for (const f of skipped.slice(0, 10)) {
    console.log(`  - ${f.name.substring(0, 60)}... (${formatSize(f.size)})`)
  }
  if (skipped.length > 10) console.log(`  ... 还有 ${skipped.length - 10} 个`)
}

if (DRY_RUN) {
  console.log('\n✅ 预览完成（dry-run 模式，未实际上传）')
  console.log(`   准备上传: ${toUpload.length} 个文件`)
  const sample = toUpload.slice(0, 5)
  console.log('\n   示例路径:')
  for (const f of sample) {
    console.log(`     → ${getStoragePath(f, f.folder)}`)
  }
  process.exit(0)
}

// 上传
const limited = toUpload.slice(0, LIMIT)
const urls = []
let uploaded = 0
let failed = 0
let totalSize = 0

console.log(`\n开始上传 ${limited.length} 个文件 (并发: ${CONCURRENCY})...\n`)

// 分批并发上传
const batches = []
for (let i = 0; i < limited.length; i += CONCURRENCY) {
  batches.push(limited.slice(i, i + CONCURRENCY))
}

for (let bi = 0; bi < batches.length; bi++) {
  const batch = batches[bi]
  const batchResults = await Promise.allSettled(
    batch.map(async (file) => {
      const storagePath = getStoragePath(file, file.folder)
      const fileBuffer = readFileSync(file.path)

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: 'video/mp4',
          upsert: false,
          cacheControl: 'public, max-age=31536000, immutable',
        })

      if (error) {
        // 如果是文件已存在，不算失败
        if (error.message?.includes('Duplicate') || error.message?.includes('already exists')) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`
          return { url: publicUrl, path: storagePath, file, status: 'exists' }
        }
        throw new Error(error.message)
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${data.path}`
      return { url: publicUrl, path: data.path, file, status: 'uploaded' }
    })
  )

  for (const result of batchResults) {
    if (result.status === 'fulfilled') {
      uploaded++
      totalSize += result.value.file.size
      urls.push(result.value)
      const marker = result.value.status === 'exists' ? '⏭' : '✅'
      console.log(`  ${marker} [${uploaded}/${limited.length}] ${result.value.file.name.substring(0, 50)}...`)
    } else {
      failed++
      console.log(`  ❌ [失败] ${result.reason?.message?.substring(0, 80)}`)
    }
  }
}

// 汇总
console.log('\n' + '─'.repeat(40))
console.log(`✅ 上传完成`)
console.log(`   成功: ${uploaded} 个`)
if (failed > 0) console.log(`   失败: ${failed} 个`)
console.log(`   总大小: ${formatSize(totalSize)}`)

// 保存 URL 映射
writeFileSync(OUTPUT_URLS_FILE, JSON.stringify(urls, null, 2))
console.log(`\n📄 URL 映射已保存: ${OUTPUT_URLS_FILE}`)
console.log(`   供 seed-video-content.mjs 使用`)
