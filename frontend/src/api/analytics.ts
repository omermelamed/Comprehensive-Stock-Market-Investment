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
  portfolioIndex: number
}

export interface AnalyticsBenchmarkPoint {
  date: string
  benchmarkIndex: number
}

export interface AnalyticsBenchmark {
  symbol: string
  periodReturnPct: number
  points: AnalyticsBenchmarkPoint[]
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

export interface RealizedTradeEntry {
  symbol: string
  quantity: number
  buyPrice: number
  sellPrice: number
  pnl: number
  pnlPercent: number
  closedAt: string
}

export interface RealizedPnlSummary {
  totalRealizedPnl: number
  trades: RealizedTradeEntry[]
}

export interface AnalyticsResponse {
  range: string
  currency: string
  performanceMetrics: AnalyticsPerformanceMetrics
  chartPoints: AnalyticsChartPoint[]
  positions: AnalyticsPositionMetric[]
  benchmark: AnalyticsBenchmark | null
  realizedPnl?: RealizedPnlSummary | null
}

export interface MonthlyReturnEntry {
  month: string
  startValue: number
  endValue: number
  returnAbsolute: number
  returnPct: number
}

export interface MonthlyReturnsResponse {
  range: string
  currency: string
  months: MonthlyReturnEntry[]
}

export const getAnalytics = (range: string): Promise<AnalyticsResponse> =>
  client.get<AnalyticsResponse>('/api/analytics', { params: { range } }).then(r => r.data)

export const getMonthlyReturns = (range: string): Promise<MonthlyReturnsResponse> =>
  client.get<MonthlyReturnsResponse>('/api/analytics/monthly-returns', { params: { range } }).then(r => r.data)

export const getAnalyticsBenchmark = (
  symbol: string = 'SPY',
  range: string = '1Y'
): Promise<AnalyticsBenchmark | null> =>
  client
    .get<AnalyticsBenchmark | null>('/api/analytics/benchmark', { params: { symbol, range } })
    .then(r => r.data)
