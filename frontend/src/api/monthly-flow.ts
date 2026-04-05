import client from './client'
import type { MonthlyFlowConfirmResult, MonthlyFlowPreview } from '@/types'

export interface PositionSummary {
  symbol: string
  summary: string
}

export async function previewMonthlyFlow(budget: number): Promise<MonthlyFlowPreview> {
  const res = await client.post<MonthlyFlowPreview>('/api/monthly-flow/preview', { budget })
  return res.data
}

export async function fetchAiSummaries(budget: number): Promise<PositionSummary[]> {
  const res = await client.post<PositionSummary[]>('/api/monthly-flow/summaries', { budget })
  return res.data
}

export async function confirmMonthlyFlow(
  budget: number,
  allocations: { symbol: string; amount: number }[]
): Promise<MonthlyFlowConfirmResult> {
  const res = await client.post<MonthlyFlowConfirmResult>('/api/monthly-flow/confirm', {
    budget,
    allocations,
  })
  return res.data
}
