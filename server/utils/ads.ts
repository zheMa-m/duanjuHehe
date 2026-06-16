import { H3Event } from 'h3'
import { getDB } from './db'
import { getClientRealIP } from './ip'

/**
 * 广告工具层 — 广告位管理 / 事件追踪 / 收入汇总
 */

export interface AdSlotConfig {
  id: string
  name: string
  position: 'header_banner' | 'footer_banner' | 'native_inline' | 'interstitial'
  is_active: boolean
  campaign_id: string | null
  ad_provider: 'adsense' | 'meta' | 'custom'
  ad_config: Record<string, any>
  sort_order: number
  created_at: string
}

export interface AdEvent {
  ad_slot_id: string
  event_type: 'impression' | 'click'
  campaign_subdomain?: string
  ip?: string
  user_agent?: string
  referrer?: string
}

// ── 获取活跃广告位 ───────────────────────────────────────────
export async function getActiveAdSlots(
  event: H3Event,
  position?: string,
  subdomain?: string
): Promise<AdSlotConfig[]> {
  const db = getDB(event)

  let query = db.from('ad_slots').select('*').eq('is_active', true)

  if (position) {
    query = query.eq('position', position)
  }

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error || !data) return []

  // 如果有 subdomain 过滤，在结果集中筛选（campaign_id 关联）
  let slots = data as AdSlotConfig[]

  // 全局广告位（campaign_id=null）始终包含
  // 绑定特定 campaign 的广告位仅在 subdomain 匹配时包含
  if (subdomain) {
    const { data: campaigns } = await db.from('campaigns').select('id, subdomain')
    const campaignMap = new Map((campaigns || []).map((c: any) => [c.id, c.subdomain]))

    slots = slots.filter(slot => {
      if (!slot.campaign_id) return true // 全局广告位
      return campaignMap.get(slot.campaign_id) === subdomain
    })
  }

  return slots
}

// ── 记录广告事件 ─────────────────────────────────────────────
export async function recordAdEvent(
  event: H3Event,
  eventData: AdEvent
): Promise<void> {
  const db = getDB(event)
  const ip = getClientRealIP(event)
  const userAgent = event.headers.get('user-agent') || ''
  const referrer = event.headers.get('referer') || ''

  await db.from('ad_events').insert({
    ad_slot_id: eventData.ad_slot_id,
    event_type: eventData.event_type,
    campaign_subdomain: eventData.campaign_subdomain || null,
    ip,
    user_agent: userAgent,
    referrer,
    created_at: new Date().toISOString()
  })
}

// ── 获取广告收入汇总 ─────────────────────────────────────────
export async function getAdRevenueSummary(
  event: H3Event,
  days: number = 7
): Promise<{
  totalImpressions: number
  totalClicks: number
  ctr: number
  estimatedRevenue: number
  bySlot: Array<{ slotId: string; slotName: string; impressions: number; clicks: number }>
}> {
  const db = getDB(event)
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data: events } = await db.from('ad_events').select('*')
  const filtered = (events || []).filter((e: any) => e.created_at >= since)

  const impressions = filtered.filter((e: any) => e.event_type === 'impression').length
  const clicks = filtered.filter((e: any) => e.event_type === 'click').length
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0

  // 简单 CPM 估算：$2.00 per 1000 impressions
  const estimatedRevenue = (impressions / 1000) * 2.0

  // 按广告位分组
  const slotMap = new Map<string, { impressions: number; clicks: number }>()
  for (const e of filtered) {
    const existing = slotMap.get(e.ad_slot_id) || { impressions: 0, clicks: 0 }
    if (e.event_type === 'impression') existing.impressions++
    if (e.event_type === 'click') existing.clicks++
    slotMap.set(e.ad_slot_id, existing)
  }

  const { data: slots } = await db.from('ad_slots').select('*')
  const slotNames = new Map<string, string>((slots || []).map((s: any) => [s.id, s.name as string]))

  const bySlot = Array.from(slotMap.entries()).map(([slotId, stats]) => ({
    slotId,
    slotName: slotNames.get(slotId) || 'Unknown',
    ...stats,
  }))

  return {
    totalImpressions: impressions,
    totalClicks: clicks,
    ctr: Math.round(ctr * 100) / 100,
    estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
    bySlot,
  }
}
