/**
 * 视频内容种子脚本
 *
 * 写入系列 (Series) 和分集 (Episodes) 到 Supabase 数据库。
 * 所有 video_url 指向 Supabase Storage 公开 URL。
 *
 * 运行：
 *   node scripts/seed-video-content.mjs              # 写入新数据 + 修复旧 Google URL
 *   node scripts/seed-video-content.mjs --clean       # 先清理再写入
 *   node scripts/seed-video-content.mjs --fix-urls    # 仅修复 Google URL → 本地路径
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ─── 加载 .env ────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env')
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
        const t = line.trim()
        if (!t || t.startsWith('#')) continue
        const i = t.indexOf('=')
        if (i > 0) process.env[t.slice(0, i).trim()] ||= t.slice(i + 1).trim()
      }
    }
  } catch (_) {}
}
loadEnv()

const CLEAN = process.argv.includes('--clean')
const FIX_URLS_ONLY = process.argv.includes('--fix-urls')

// ─── 本地视频 ─────────────────────────────────────────────
const SUPABASE_STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public/series-videos`

// 优先从 video-urls.json 加载（upload-videos-to-storage.mjs 生成），
// 回退到 Supabase Storage 公开 URL
const SAMPLES = (() => {
  try {
    const urlFile = join(process.cwd(), 'scripts/video-urls.json')
    if (existsSync(urlFile)) {
      const urls = JSON.parse(readFileSync(urlFile, 'utf-8'))
      if (Array.isArray(urls) && urls.length > 0) {
        return urls.map(u => u.url)
      }
    }
  } catch (_) {}
  // 回退：硬编码 Supabase Storage URL（视频已通过 upload-videos-to-storage.mjs 上传）
  console.warn('⚠️  video-urls.json 未找到，使用默认 Supabase Storage URL')
  return [
    `${SUPABASE_STORAGE_BASE}/other/42afb619_sample-01-flying-dance.mp4`,
    `${SUPABASE_STORAGE_BASE}/other/f860e50a_sample-02-shine-bright.mp4`,
    `${SUPABASE_STORAGE_BASE}/other/ab1e91ae_sample-03-be-yourself.mp4`,
    `${SUPABASE_STORAGE_BASE}/other/7c1adf07_sample-04-street-style.mp4`,
    `${SUPABASE_STORAGE_BASE}/other/979487b6_sample-05-new-year-dance.mp4`,
    `${SUPABASE_STORAGE_BASE}/other/28496ec5_sample-06-flying-dance-2.mp4`,
    `${SUPABASE_STORAGE_BASE}/other/4e0c571a_sample-07-partner-dance.mp4`,
    `${SUPABASE_STORAGE_BASE}/other/e8049c87_sample-08-persist-dance.mp4`,
    `${SUPABASE_STORAGE_BASE}/other/6bc334e1_sample-09-guzhuang-dance.mp4`,
    `${SUPABASE_STORAGE_BASE}/other/2f196ce5_sample-10-free-spirit.mp4`,
  ]
})()

if (!SAMPLES.length) {
  console.error('❌ 未找到视频 URL，请先运行 scripts/upload-videos-to-storage.mjs')
  process.exit(1)
}
console.log(`📁 ${SAMPLES.length} 个 Supabase Storage 示例视频`)

// ─── Supabase ─────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('❌ SUPABASE_URL 未配置，请检查 .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
console.log(`🔗 ${supabaseUrl}\n`)

// ─── 修复旧 Google URL ────────────────────────────────────
async function fixOldGoogleUrls() {
  console.log('🔧 修复旧 Google 视频 URL → 本地路径...')
  const { data: eps } = await supabase.from('episodes').select('id, video_url').ilike('video_url', '%googleapis%')
  if (!eps?.length) { console.log('   无需修复\n'); return }

  let fixed = 0
  for (const ep of eps) {
    const idx = fixed % SAMPLES.length
    const { error } = await supabase.from('episodes').update({ video_url: SAMPLES[idx] }).eq('id', ep.id)
    if (!error) fixed++
  }
  console.log(`   ✅ 已修复 ${fixed} 个 episode\n`)
}

// ─── 新数据 ────────────────────────────────────────────────
const GENRES = [
  { name: '舞蹈', slug: 'dance', icon: 'i-lucide-music' },
  { name: '锅庄舞', slug: 'guozhuang', icon: 'i-lucide-sparkles' },
  { name: '异域风情', slug: 'exotic', icon: 'i-lucide-star' },
  { name: '时尚穿搭', slug: 'fashion', icon: 'i-lucide-shirt' },
]

const NEW_SERIES = [
  {
    title: '藏族舞蹈精选', slug: 'tibetan-dance', genre: 'dance',
    desc: '阿卓最新藏族舞蹈精选合集，包含锅庄舞、民族服装展示等精彩内容，带你感受雪域高原的独特魅力。',
    tags: ['藏族', '舞蹈', '民族风', '锅庄'], featured: true, eps: 10,
  },
  {
    title: '锅庄舞合集', slug: 'guozhuang-dance', genre: 'guozhuang',
    desc: '精彩绝伦的藏族锅庄舞表演，传统与现代完美融合，展现藏文化独特的艺术魅力。',
    tags: ['锅庄舞', '藏族', '传统文化'], featured: true, eps: 10,
  },
  {
    title: '西域风情', slug: 'exotic-dance', genre: 'exotic',
    desc: '西域风情舞蹈系列，异域风情与古典韵味交织，带你走进神秘的西域世界。',
    tags: ['异域风情', '西域', '舞蹈'], featured: false, eps: 10,
  },
  {
    title: '街拍穿搭', slug: 'street-style', genre: 'fashion',
    desc: '时尚街拍与穿搭灵感，展现自信与气质。户外舞蹈与日常穿搭的完美结合。',
    tags: ['街拍', '穿搭', '时尚', '户外'], featured: false, eps: 10,
  },
]

// ─── 主流程 ───────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  视频内容种子数据')
  console.log('═══════════════════════════════════════════════\n')

  // 仅修复模式
  if (FIX_URLS_ONLY) { await fixOldGoogleUrls(); return }

  // 修复旧 URL
  await fixOldGoogleUrls()

  // 清理
  if (CLEAN) {
    console.log('🧹 清理旧数据...')
    for (const s of NEW_SERIES) {
      const { data: ex } = await supabase.from('series').select('id').eq('slug', s.slug).maybeSingle()
      if (ex) { await supabase.from('series').delete().eq('id', ex.id); console.log(`   已删除: ${s.slug}`) }
    }
    for (const g of GENRES) {
      await supabase.from('genres').delete().eq('slug', g.slug)
    }
    console.log()
  }

  // 1. Genres
  console.log('1️⃣  创建分类...')
  const genreIds = {}
  for (const g of GENRES) {
    const { data: ex } = await supabase.from('genres').select('id').eq('slug', g.slug).maybeSingle()
    if (ex) { genreIds[g.slug] = ex.id; console.log(`   ⏭  ${g.name}`); continue }
    const { data, error } = await supabase.from('genres').insert({ ...g, sort_order: 1 }).select('id').single()
    if (!error) { genreIds[g.slug] = data.id; console.log(`   ✅ ${g.name}`) }
    else console.error(`   ❌ ${g.name}: ${error.message}`)
  }

  // 2. Series
  console.log('\n2️⃣  创建系列...')
  const seriesIds = {}
  for (const s of NEW_SERIES) {
    const { data: ex } = await supabase.from('series').select('id').eq('slug', s.slug).maybeSingle()
    if (ex) { seriesIds[s.slug] = ex.id; console.log(`   ⏭  ${s.title}`); continue }
    const { data, error } = await supabase.from('series').insert({
      title: s.title, slug: s.slug, description: s.desc,
      genre_id: genreIds[s.genre], tags: s.tags,
      status: 'published', total_episodes: s.eps, free_episodes: s.eps,
      is_featured: s.featured, rating: 4.5 + Math.random() * 0.5,
      cover_image: '', poster_image: '', sort_order: 1,
    }).select('id').single()
    if (!error) { seriesIds[s.slug] = data.id; console.log(`   ✅ ${s.title}`) }
    else console.error(`   ❌ ${s.title}: ${error.message}`)
  }

  // 3. Episodes
  console.log('\n3️⃣  创建分集...')
  let epTotal = 0
  for (const s of NEW_SERIES) {
    const sid = seriesIds[s.slug]
    if (!sid) { console.log(`   ⚠️  跳过 ${s.title}（无 series_id）`); continue }

    const { data: existingEps } = await supabase.from('episodes').select('id').eq('series_id', sid)
    if (existingEps?.length) { console.log(`   ⏭  ${s.title}: ${existingEps.length} 集已存在`); epTotal += existingEps.length; continue }

    const rows = []
    for (let i = 1; i <= s.eps; i++) {
      rows.push({
        series_id: sid, episode_number: i,
        title: `${s.title} 第 ${i} 集`,
        description: `${s.title} - 精彩视频第 ${i} 集`,
        video_url: SAMPLES[(i - 1) % SAMPLES.length],
        thumbnail_url: '', duration_seconds: 60,
        is_free: true, coin_cost: 0, sort_order: i, status: 'published',
      })
    }
    const { error } = await supabase.from('episodes').insert(rows)
    if (!error) { epTotal += rows.length; console.log(`   ✅ ${s.title}: ${rows.length} 集`) }
    else console.error(`   ❌ ${s.title}: ${error.message}`)
  }

  console.log(`\n${'─'.repeat(40)}`)
  console.log(`✅ 完成！${Object.keys(genreIds).length} 分类, ${Object.keys(seriesIds).length} 系列, ${epTotal} 分集`)
  console.log('💡 重启 dev server 即可看到新内容\n')
}

main().catch(e => { console.error(e); process.exit(1) })
