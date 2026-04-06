import client from './client'

export interface AnalyticsPerformanceMetrics {
  snapshotCount: number
  periodStart: string | null
  periodEnd: string | null
  costBasisReturnPct: number | null
  costBasisReturnAbsolute: number
  snapshotPeriodReturnPct: number | null
  annualizedReturnPct: number | null
  volatilityAnnualizedPct: number | null
  maxDrawdownPct: number | null
  sharpeRatio: number | null
}

export interface AnalyticsChartPoint {
  date: string
  portfolioValue: number
}

export interface AnalyticsPositionMetric {
  symbol: string
  label: string | null
  currentValue: number
  costBasis: number
  pnlAbsolute: number
  pnlPercent: number
  portfolioWeightPct: number
}

export interface AnalyticsResponse {
  range: string
  currency: string
  performanceMetrics: AnalyticsPerformanceMetrics
  chartPoints: AnalyticsChartPoint[]
  positions: AnalyticsPositionMetric[]
}

export const getAnalytics = (range: string): Promise<AnalyticsResponse> =>
  client.get<AnalyticsResponse>('/api/analytics', { params: { range } }).then(r => r.data)
