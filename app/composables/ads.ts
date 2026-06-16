/**
 * useAdSlot — 广告位获取 / 事件上报 / 可见性追踪
 */
export interface AdSlotData {
  id: string
  name: string
  position: string
  is_active: boolean
  ad_provider: string
  ad_config: Record<string, any>
  sort_order: number
}

export function useAdSlot(position: string, subdomain?: string) {
  const slots = ref<AdSlotData[]>([])
  const isLoading = ref(false)

  // 获取活跃广告位
  const fetchSlots = async () => {
    isLoading.value = true
    try {
      const params = new URLSearchParams({ position })
      if (subdomain) params.set('subdomain', subdomain)
      const res = await $fetch<any>(`/api/v1/ads?${params.toString()}`)
      slots.value = res.data || []
    } catch {
      slots.value = []
    } finally {
      isLoading.value = false
    }
  }

  // 上报广告展示事件
  const trackImpression = async (adSlotId: string, campaignSubdomain?: string) => {
    try {
      await $fetch('/api/v1/ads/event', {
        method: 'POST',
        body: { adSlotId, eventType: 'impression', campaignSubdomain },
      })
    } catch {
      // 静默处理，广告事件上报失败不阻塞业务
    }
  }

  // 上报广告点击事件
  const trackClick = async (adSlotId: string, campaignSubdomain?: string) => {
    try {
      await $fetch('/api/v1/ads/event', {
        method: 'POST',
        body: { adSlotId, eventType: 'click', campaignSubdomain },
      })
    } catch {
      // 静默处理
    }
  }

  return {
    slots: readonly(slots),
    isLoading: readonly(isLoading),
    fetchSlots,
    trackImpression,
    trackClick,
  }
}
