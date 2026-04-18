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
  avgBuyPrice: number      // in nativeCurrency
  currentPrice: number     // in nativeCurrency
  nativeCurrency: string   // e.g. "USD" for US ETFs
  currentValue: number     // in portfolio currency
  costBasis: number        // in portfolio currency
  pnlAbsolute: number      // in portfolio currency
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

export interface SymbolHistoryPoint {
  date: string
  pnlValue: number    // monetary P&L in portfolio currency
  price: number       // closing price in native currency
  avgCost: number     // avg cost per share in native currency
  sharesHeld: number
  pnlPercent: number
}

export interface TransactionMarker {
  date: string
  type: 'BUY' | 'SELL'
  quantity: number
  pricePerUnit: number
}

export interface SymbolHistorySeries {
  symbol: string
  label: string | null
  points: SymbolHistoryPoint[]
  periodReturnPct: number
  transactions: TransactionMarker[]
  nativeCurrency: string
}

export interface HoldingsHistoryResponse {
  range: string
  series: SymbolHistorySeries[]
  currency: string
}

export async function getHoldingsHistory(range: string): Promise<HoldingsHistoryResponse> {
  const res = await client.get<HoldingsHistoryResponse>('/api/portfolio/holdings-history', { params: { range } })
  return res.data
}

export interface OhlcBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OhlcResponse {
  symbol: string
  currency: string
  bars: OhlcBar[]
}

export async function getOhlcData(symbol: string, range: string): Promise<OhlcResponse> {
  const res = await client.get<OhlcResponse>('/api/portfolio/ohlc', { params: { symbol, range } })
  return res.data
}
