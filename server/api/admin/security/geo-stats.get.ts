/**
 * GET /api/admin/security/geo-stats — IP 地理分布统计
 * @api-auth: admin
 * 从 activity_logs 聚合 metadata->>'country'，按国家分组统计拦截次数
 */
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：查询安全事件地理分布',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '按国家分组的安全事件统计' },
    },
  },
} as any)

/** ISO 3166 国家代码 → 中文名映射（常用） */
const COUNTRY_NAMES: Record<string, string> = {
  CN: '中国', US: '美国', RU: '俄罗斯', KP: '朝鲜', IR: '伊朗',
  JP: '日本', KR: '韩国', DE: '德国', GB: '英国', FR: '法国',
  IN: '印度', BR: '巴西', CA: '加拿大', AU: '澳大利亚', SG: '新加坡',
  HK: '香港', TW: '台湾', VN: '越南', TH: '泰国', ID: '印尼',
  MY: '马来西亚', PH: '菲律宾', TR: '土耳其', NL: '荷兰', IT: '意大利',
  ES: '西班牙', PL: '波兰', UA: '乌克兰', SE: '瑞典', NO: '挪威',
  XX: '未知',
}

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  // 查询所有安全事件的 country + metadata
  const { data, error } = await db
    .from('activity_logs')
    .select('country, metadata, action')
    .eq('category', 'system')
    .like('action', 'api_security_%')

  if (error) {
    return sendSuccess(event, { countries: [] })
  }

  // 聚合：按国家代码统计
  const countryMap = new Map<string, { total: number; blocked: number }>()

  for (const row of (data || [])) {
    const code = (row.country || row.metadata?.country || 'XX').toUpperCase().slice(0, 2)
    if (!countryMap.has(code)) {
      countryMap.set(code, { total: 0, blocked: 0 })
    }
    const entry = countryMap.get(code)!
    entry.total++
    if (row.metadata?.status === 'BLOCKED' || row.action?.includes('blocked')) {
      entry.blocked++
    }
  }

  const countries = [...countryMap.entries()]
    .map(([code, stats]) => ({
      code,
      name: COUNTRY_NAMES[code] || code,
      count: stats.total,
      blocked: stats.blocked,
    }))
    .sort((a, b) => b.count - a.count)

  return sendSuccess(event, { countries })
})
