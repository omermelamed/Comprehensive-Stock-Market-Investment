import client from './client'

export interface PerformanceMetrics {
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

export interface ChartPoint {
  date: string
  portfolioValue: number
  portfolioIndex: number
}

export interface PositionPnl {
  symbol: string
  label: string | null
  currentValue: number
  costBasis: number
  pnlAbsolute: number
  pnlPercent: number
  portfolioWeightPct: number
}

export interface BenchmarkData {
  symbol: string
  periodReturnPct: number
  points: Array<{ date: string; benchmarkIndex: number }>
}

export interface RealizedTrade {
  symbol: string
  quantity: number
  buyPrice: number
  sellPrice: number
  pnl: number
  pnlPercent: number
  closedAt: string
}

export interface RealizedPnl {
  totalRealizedPnl: number
  trades: RealizedTrade[]
}

export interface AnalyticsResponse {
  range: string
  currency: string
  performanceMetrics: PerformanceMetrics
  chartPoints: ChartPoint[]
  positions: PositionPnl[]
  benchmark: BenchmarkData | null
  realizedPnl: RealizedPnl | null
}

export interface MonthlyReturn {
  month: string
  returnPct: number
}

export async function getAnalytics(range: string): Promise<AnalyticsResponse> {
  const res = await client.get<AnalyticsResponse>('/api/analytics', { params: { range } })
  return res.data
}

export async function getMonthlyReturns(range: string): Promise<MonthlyReturn[]> {
  const res = await client.get<MonthlyReturn[]>('/api/analytics/monthly-returns', { params: { range } })
  return res.data
}

export async function getBenchmark(symbol: string, range: string): Promise<BenchmarkData> {
  const res = await client.get<BenchmarkData>('/api/analytics/benchmark', { params: { symbol, range } })
  return res.data
}
