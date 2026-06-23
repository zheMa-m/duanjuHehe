/**
 * 通用数据导出引擎 — 支持 CSV / XLSX 格式
 *
 * 使用方式：
 * ```ts
 * import { exportCSV, exportXLSX } from '~/server/utils/export'
 *
 * // CSV 导出
 * const csvBuffer = exportCSV(users, ['id', 'email', 'created_at'])
 *
 * // XLSX 导出
 * const xlsxBuffer = await exportXLSX(users, '用户列表', [
 *   { header: 'ID', key: 'id', width: 36 },
 *   { header: '邮箱', key: 'email', width: 30 },
 * ])
 * ```
 */

import ExcelJS from 'exceljs'

// ── CSV 导出 ──

/**
 * 生成 CSV 文件（UTF-8 BOM，Excel 兼容）
 *
 * @param data - 数据行数组
 * @param columns - 要导出的字段名列表
 * @param headers - 可选的自定义表头，默认使用 columns
 * @returns Buffer - 可直接作为响应体返回
 */
export function exportCSV<T extends Record<string, any>>(
  data: T[],
  columns: (keyof T)[],
  headers?: string[]
): Buffer {
  const headerRow = headers || (columns as string[])
  const lines: string[] = []

  // UTF-8 BOM + 表头
  lines.push('\uFEFF' + headerRow.map(escapeCSV).join(','))

  // 数据行
  for (const row of data) {
    const values = columns.map((col) => escapeCSV(String(row[col] ?? '')))
    lines.push(values.join(','))
  }

  return Buffer.from(lines.join('\n'), 'utf-8')
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ── XLSX 导出 ──

export interface XLSXColumn {
  header: string
  key: string
  width?: number
  style?: Partial<ExcelJS.Style>
}

/**
 * 生成 XLSX 文件
 *
 * @param data - 数据行数组
 * @param sheetName - 工作表名称
 * @param columns - 列定义
 * @returns Buffer - 可直接作为响应体返回
 */
export async function exportXLSX<T extends Record<string, any>>(
  data: T[],
  sheetName: string,
  columns: XLSXColumn[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'HeHe App'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // 列定义
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
  }))

  // 表头样式
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0A0E1A' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 28

  // 数据行
  for (const item of data) {
    const row = sheet.addRow(item)
    row.alignment = { vertical: 'middle' }
    row.height = 22
  }

  // 自动筛选
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: data.length + 1, column: columns.length },
  }

  // 输出 Buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ── 响应辅助函数 ──

/**
 * 设置 CSV 下载响应头
 */
export function setCSVHeaders(event: any, filename: string): void {
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}.csv"`)
}

/**
 * 设置 XLSX 下载响应头
 */
export function setXLSXHeaders(event: any, filename: string): void {
  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}.xlsx"`)
}
