import client from './client'

export interface ImportPreviewRequest {
  file: File
  columnMapping: Record<string, string>
}

export interface ParsedRow {
  symbol: string
  transactionType: string
  track: string
  quantity: string
  pricePerUnit: string
  totalAmount: string
  fees: string
  currency: string
  transactionDate: string
  notes: string | null
}

export interface ImportPreviewRow {
  rowIndex: number
  status: 'OK' | 'ERROR'
  errors: string[]
  parsedRow: ParsedRow | null
}

export interface ImportPreviewResponse {
  detectedColumns: string[]
  rows: ImportPreviewRow[]
  validCount: number
  errorCount: number
}

export interface ImportConfirmResponse {
  imported: number
  skipped: number
}

export async function previewImport(
  file: File,
  columnMapping: Record<string, string>,
): Promise<ImportPreviewResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('columnMapping', JSON.stringify(columnMapping))
  const res = await client.post<ImportPreviewResponse>('/api/import/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function confirmImport(rows: ParsedRow[]): Promise<ImportConfirmResponse> {
  const res = await client.post<ImportConfirmResponse>('/api/import/confirm', { rows })
  return res.data
}
