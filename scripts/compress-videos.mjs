/**
 * 视频压缩脚本
 *
 * 使用 ffmpeg 批量压缩源视频到 Web 友好格式：
 *   H.264, 720p, CRF 26, AAC 128k, faststart
 *
 * 前提：需要安装 ffmpeg（brew install ffmpeg / choco install ffmpeg）
 *
 * 运行：
 *   node scripts/compress-videos.mjs                    # 压缩全部
 *   node scripts/compress-videos.mjs --samples-only     # 仅生成示例视频
 *   node scripts/compress-videos.mjs --limit 50          # 限制数量（测试用）
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

// ─── 配置 ────────────────────────────────────────────────
const SOURCE_DIR = 'D:/1.洛洛和户村/5.阿卓-美女跳舞藏族'
const OUTPUT_DIR = 'public/videos/compressed'
const SAMPLES_DIR = 'public/videos/samples'
const SAMPLES_ONLY = process.argv.includes('--samples-only')
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0') || Infinity

// ffmpeg 压缩参数
const FFMPEG_ARGS = [
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '26',
  '-vf', 'scale=720:-2',
  '-c:a', 'aac',
  '-b:a', '128k',
  '-ac', '2',
  '-movflags', '+faststart',
  '-y', // 覆盖已存在文件
]

// ─── 工具函数 ─────────────────────────────────────────────
function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

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
  } catch (_) { /* skip unreadable dirs */ }
  return results
}

function safeFileName(name) {
  return basename(name, '.mp4')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80) || 'video'
}

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ─── 主流程 ───────────────────────────────────────────────
console.log('═══════════════════════════════════════════════')
console.log('  视频压缩工具')
console.log('═══════════════════════════════════════════════\n')

// 检查 ffmpeg
try {
  execSync('ffmpeg -version', { stdio: 'pipe' })
} catch {
  console.error('❌ 未找到 ffmpeg！请先安装：')
  console.error('   Windows: choco install ffmpeg')
  console.error('   Mac:     brew install ffmpeg')
  console.error('   Linux:   apt install ffmpeg')
  process.exit(1)
}

// 扫描源文件
console.log('扫描源视频...')
const allFiles = findFiles(SOURCE_DIR)
console.log(`找到 ${allFiles.length} 个视频文件\n`)

// 按大小排序
allFiles.sort((a, b) => a.size - b.size)

// 生成样本
console.log('─'.repeat(40))
console.log('生成示例视频（10 个最小文件）')
ensureDir(SAMPLES_DIR)

const samples = allFiles.slice(0, 10)
let sampleIdx = 0
for (const file of samples) {
  sampleIdx++
  const outName = `sample-${String(sampleIdx).padStart(2, '0')}-${safeFileName(file.name)}.mp4`
  const outPath = join(SAMPLES_DIR, outName)

  if (existsSync(outPath)) {
    console.log(`  ⏭  跳过: ${outName}`)
    continue
  }

  console.log(`  🎬 压缩: ${file.name.substring(0, 60)}...`)
  console.log(`     原始: ${formatSize(file.size)}`)

  try {
    execSync(`ffmpeg -i "${file.path}" ${FFMPEG_ARGS.join(' ')} "${outPath}"`, {
      stdio: 'pipe',
      timeout: 120_000,
    })
    const outSize = statSync(outPath).size
    console.log(`     输出: ${formatSize(outSize)} (${((1 - outSize / file.size) * 100).toFixed(0)}% 压缩)`)
  } catch (e) {
    console.error(`     ❌ 失败: ${e.message?.substring(0, 100)}`)
  }
}

if (SAMPLES_ONLY) {
  console.log('\n✅ 示例视频生成完毕')
  process.exit(0)
}

// 压缩全部
console.log('\n' + '─'.repeat(40))
console.log('压缩全部视频')
ensureDir(OUTPUT_DIR)

const toCompress = allFiles.slice(0, LIMIT)
let idx = 0
let totalOriginal = 0
let totalCompressed = 0

for (const file of toCompress) {
  idx++
  const outName = `${safeFileName(file.name)}.mp4`
  const outPath = join(OUTPUT_DIR, outName)

  if (existsSync(outPath)) {
    console.log(`  [${idx}/${toCompress.length}] ⏭  跳过: ${outName}`)
    continue
  }

  process.stdout.write(`  [${idx}/${toCompress.length}] 🎬 ${file.name.substring(0, 50)}... `)

  try {
    execSync(`ffmpeg -i "${file.path}" ${FFMPEG_ARGS.join(' ')} "${outPath}"`, {
      stdio: 'pipe',
      timeout: 180_000,
    })
    const outSize = statSync(outPath).size
    totalOriginal += file.size
    totalCompressed += outSize
    console.log(`${formatSize(file.size)} → ${formatSize(outSize)}`)
  } catch (e) {
    console.log(`❌ 失败`)
  }
}

console.log('\n' + '─'.repeat(40))
console.log(`✅ 压缩完成`)
console.log(`   文件数: ${idx}`)
if (totalOriginal > 0) {
  console.log(`   原始大小: ${formatSize(totalOriginal)}`)
  console.log(`   压缩后:   ${formatSize(totalCompressed)}`)
  console.log(`   节省:     ${((1 - totalCompressed / totalOriginal) * 100).toFixed(0)}%`)
}

// 生成报告
const report = {
  timestamp: new Date().toISOString(),
  totalFiles: toCompress.length,
  totalOriginal,
  totalCompressed,
  compressionRatio: totalOriginal > 0 ? (1 - totalCompressed / totalOriginal) : 0,
  outputDir: OUTPUT_DIR,
  samplesDir: SAMPLES_DIR,
}
writeFileSync('public/videos/compressed/compress-report.json', JSON.stringify(report, null, 2))
console.log(`\n📄 报告已保存: public/videos/compressed/compress-report.json`)
