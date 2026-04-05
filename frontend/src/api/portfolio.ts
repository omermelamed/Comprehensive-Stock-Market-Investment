import client from './client'

export interface PortfolioSummary {
  totalValue: number
  totalCostBasis: number
  totalPnlAbsolute: number
  totalPnlPercent: number
  currency: string
  holdingCount: number
  allocationHealthScore: number
}

export interface HoldingDashboard {
  symbol: string
  label: string | null
  track: string
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  currentValue: number
  costBasis: number
  pnlAbsolute: number
  pnlPercent: number
  targetPercent: number | null
  currentPercent: number
  allocationStatus: 'ON_TARGET' | 'SLIGHTLY_OFF' | 'NEEDS_REBALANCING' | 'UNTRACKED'
  drift: number
}

export interface PortfolioDataPoint {
  date: string
  totalValue: number
  dailyPnl: number
}

export interface PortfolioHistory {
  range: string
  points: PortfolioDataPoint[]
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await client.get<PortfolioSummary>('/api/portfolio/summary')
  return res.data
}

export async function getPortfolioHoldings(): Promise<HoldingDashboard[]> {
  const res = await client.get<HoldingDashboard[]>('/api/portfolio/holdings')
  return res.data
}

export async function getPortfolioHistory(range: string): Promise<PortfolioHistory> {
  const res = await client.get<PortfolioHistory>('/api/portfolio/history', { params: { range } })
  return res.data
}
