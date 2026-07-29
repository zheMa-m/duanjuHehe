import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const env = readFileSync(join(process.cwd(), '.env'), 'utf8')
  .split('\n').reduce((a, l) => {
    const t = l.trim()
    if (!t || t.startsWith('#')) return a
    const i = t.indexOf('=')
    if (i > 0) a[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    return a
  }, {})

const s = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const SUPABASE_STORAGE = 'https://omjtyrfjfonebiwfmzfz.supabase.co/storage/v1/object/public/series-videos/other'
const V = [
  `${SUPABASE_STORAGE}/42afb619_sample-01-flying-dance.mp4`,
  `${SUPABASE_STORAGE}/f860e50a_sample-02-shine-bright.mp4`,
  `${SUPABASE_STORAGE}/ab1e91ae_sample-03-be-yourself.mp4`,
  `${SUPABASE_STORAGE}/7c1adf07_sample-04-street-style.mp4`,
  `${SUPABASE_STORAGE}/979487b6_sample-05-new-year-dance.mp4`,
  `${SUPABASE_STORAGE}/28496ec5_sample-06-flying-dance-2.mp4`,
  `${SUPABASE_STORAGE}/4e0c571a_sample-07-partner-dance.mp4`,
  `${SUPABASE_STORAGE}/e8049c87_sample-08-persist-dance.mp4`,
  `${SUPABASE_STORAGE}/6bc334e1_sample-09-guzhuang-dance.mp4`,
  `${SUPABASE_STORAGE}/2f196ce5_sample-10-free-spirit.mp4`,
]

const GENRES = [
  { name: '豪门', slug: 'billionaire', icon: 'i-lucide-crown' },
  { name: '狼人', slug: 'werewolf', icon: 'i-lucide-moon' },
  { name: '复仇', slug: 'revenge', icon: 'i-lucide-swords' },
  { name: '总裁', slug: 'ceo', icon: 'i-lucide-briefcase' },
  { name: '黑帮', slug: 'mafia', icon: 'i-lucide-shield' },
]

const SERIES = [
  { ti: '亿万总裁的双重生活', sl: 'billionaire-double-life', g: 'billionaire', d: '她以为嫁给了一个穷修理工。但当他的秘密被揭开，一切都变了...', ta: ['豪门', '马甲', '浪漫'], ep: 8, fr: 5, fe: true },
  { ti: '禁忌阿尔法之恋', sl: 'forbidden-alpha', g: 'werewolf', d: '一个人类女孩发现自己是狼人首领的命定伴侣。但古老律法禁止他们的爱情。', ta: ['狼人', '阿尔法', '禁忌之恋'], ep: 8, fr: 5, fe: true },
  { ti: '豪门千金归来', sl: 'secret-heiress', g: 'revenge', d: '人人以为她是拜金女。直到她万亿帝国继承人的身份被揭穿...', ta: ['豪门', '千金', '复仇'], ep: 8, fr: 5, fe: false },
  { ti: '黑帮新娘', sl: 'mafia-boss-bride', g: 'mafia', d: '为拯救家人，她同意嫁给最令人恐惧的黑帮头目。但他并非她想象的那样...', ta: ['黑帮', '婚姻', '暗黑'], ep: 8, fr: 5, fe: false },
  { ti: '总裁在上', sl: 'ceo-above-me-below', g: 'ceo', d: '笨拙的实习生不小心把咖啡洒在冷酷总裁身上。他没有解雇她，反而提拔她为私人助理。', ta: ['总裁', '办公室', '喜剧'], ep: 8, fr: 5, fe: true },
]

const gids = {}
for (const g of GENRES) {
  let { data } = await s.from('genres').select('id').eq('slug', g.slug).maybeSingle()
  if (!data) {
    const r = await s.from('genres').insert(g).select('id').single()
    data = r.data
  }
  if (data) { gids[g.slug] = data.id; console.log('✅ 分类: ' + g.name) }
}

for (const x of SERIES) {
  let { data } = await s.from('series').select('id').eq('slug', x.sl).maybeSingle()
  if (data) { console.log('⏭ ' + x.ti + ' (已存在)'); continue }
  const { data: d } = await s.from('series').insert({
    title: x.ti, slug: x.sl, description: x.d, genre_id: gids[x.g], tags: x.ta,
    status: 'published', total_episodes: x.ep, free_episodes: x.fr,
    is_featured: x.fe, rating: 4.5 + Math.random() * 0.5,
    cover_image: '', poster_image: '', sort_order: 1,
  }).select('id').single()
  if (!d) { console.log('❌ ' + x.ti); continue }
  const eps = []
  for (let i = 1; i <= x.ep; i++) {
    eps.push({
      series_id: d.id, episode_number: i, title: x.ti + ' Ep' + i,
      video_url: V[(i - 1) % 10], thumbnail_url: '', duration_seconds: 60,
      is_free: i <= x.fr, coin_cost: i <= x.fr ? 0 : 5 + i, sort_order: i, status: 'published',
    })
  }
  await s.from('episodes').insert(eps)
  console.log('✅ ' + x.ti + ' (' + x.ep + '集)')
}
console.log('完成！共 ' + Object.keys(gids).length + ' 分类')
