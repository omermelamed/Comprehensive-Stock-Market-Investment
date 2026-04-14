import client from './client'

type ExportFormat = 'csv' | 'xlsx'

const MIME: Record<ExportFormat, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const EXT: Record<ExportFormat, string> = {
  csv: 'csv',
  xlsx: 'xlsx',
}

async function downloadBlob(url: string, params: Record<string, string>, filename: string): Promise<void> {
  const res = await client.get(url, { params, responseType: 'blob' })
  const contentType = (res.headers['content-type'] as string | undefined) ?? MIME.csv
  const blob = new Blob([res.data as BlobPart], { type: contentType })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(href)
}

export async function downloadHoldings(format: ExportFormat): Promise<void> {
  await downloadBlob(
    '/api/export/holdings',
    { format },
    `holdings.${EXT[format]}`,
  )
}

export async function downloadTransactions(format: ExportFormat): Promise<void> {
  await downloadBlob(
    '/api/export/transactions',
    { format },
    `transactions.${EXT[format]}`,
  )
}

export async function downloadPerformance(format: ExportFormat): Promise<void> {
  await downloadBlob(
    '/api/export/performance',
    { format },
    `performance.${EXT[format]}`,
  )
}
