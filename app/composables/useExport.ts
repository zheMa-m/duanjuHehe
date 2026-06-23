/**
 * CSV 导出 composable — 通过 $fetch + Blob 下载，自动携带认证 Cookie
 *
 * 用法：
 *   const { isExporting, exportCSV } = useExport()
 *   await exportCSV('/api/admin/audit-logs/export', { category: 'auth', dateFrom: '2026-01-01' }, 'audit_logs_2026-01-01.csv')
 */
export function useExport() {
  const isExporting = ref(false)

  const exportCSV = async (baseUrl: string, params: Record<string, string> = {}, filename?: string) => {
    if (isExporting.value) return
    isExporting.value = true
    try {
      // 构建 URL
      const searchParams = new URLSearchParams()
      for (const [key, val] of Object.entries(params)) {
        if (val) searchParams.set(key, val)
      }
      const queryString = searchParams.toString()
      const url = queryString ? `${baseUrl}?${queryString}` : baseUrl

      // 通过 $fetch 获取 CSV 文本（自动携带 auth Cookie / Bearer token）
      const text = await $fetch<string>(url, { responseType: 'text' as any })

      // 构造 Blob 并触发下载
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename || `export_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err: any) {
      console.error('CSV export failed:', err)
      throw err
    } finally {
      isExporting.value = false
    }
  }

  return { isExporting, exportCSV }
}
