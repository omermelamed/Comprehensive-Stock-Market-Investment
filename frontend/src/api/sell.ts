import client from './client'

export interface SellPreview {
  symbol: string
  label: string | null
  sharesHeld: number
  avgCostPerShare: number
  currentPriceUsd: number
  currentPriceDisplay: number
  preferredCurrency: string
  exchangeRate: number
  currentValueDisplay: number
  nativeCurrency: string
  isRetroactive: boolean
  retroactiveDate: string | null
  historicalPriceUsd: number | null
  sharesHeldAtDate: number | null
  avgCostAtDate: number | null
  preview: SellPreviewCalculation | null
}

export interface SellPreviewCalculation {
  quantity: number
  sellPriceUsd: number
  totalProceedsUsd: number
  totalProceedsDisplay: number
  avgCostAtDate: number
  pnlUsd: number
  pnlDisplay: number
  pnlPercent: number
  remainingShares: number
  positionCloses: boolean
}

export interface SellRequestBody {
  symbol: string
  quantity: number
  pricePerUnit: number
  executedAt: string
  notes?: string
  source?: string
}

export interface SellResult {
  transactionId: string
  symbol: string
  quantitySold: number
  pricePerUnit: number
  totalProceedsUsd: number
  totalProceedsDisplay: number
  pnlUsd: number
  pnlDisplay: number
  pnlPercent: number
  remainingShares: number
  positionClosed: boolean
  isRetroactive: boolean
  recalculationJobId: string | null
}

export interface RecalculationStatus {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'IDLE'
  jobId?: string
  sellDate?: string
  daysCompleted?: number
  totalDays?: number
  progressPercent?: number
  estimatedSecondsRemaining?: number
  completedAt?: string
  errorMessage?: string
  queuedJobCount?: number
}

export async function getSellPreview(
  symbol: string,
  params?: { quantity?: number; price?: number; date?: string }
): Promise<SellPreview> {
  const res = await client.get<SellPreview>(`/api/holdings/${symbol}/sell-preview`, { params })
  return res.data
}

export async function executeSell(data: SellRequestBody): Promise<SellResult> {
  const res = await client.post<SellResult>('/api/transactions/sell', data)
  return res.data
}

export async function getRecalculationStatus(): Promise<RecalculationStatus> {
  const res = await client.get<RecalculationStatus>('/api/recalculation/status')
  return res.data
}

export async function retryRecalculation(jobId: string): Promise<RecalculationStatus> {
  const res = await client.post<RecalculationStatus>('/api/recalculation/retry', { jobId })
  return res.data
}
