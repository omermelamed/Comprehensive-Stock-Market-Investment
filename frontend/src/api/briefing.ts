import client from './client'

export interface MarketIndexDto {
  symbol: string
  label: string
  dayChangePercent: number
}

export interface HoldingMoverDto {
  symbol: string
  dayChangePercent: number
  portfolioValue: number
}

export interface SectorBreakdownDto {
  sector: string
  portfolioPercent: number
}

export interface NewsHeadlineDto {
  symbol: string
  headline: string
}

export interface DailyBriefingResponse {
  date: string
  currency: string
  portfolioChangePercent: number | null
  portfolioChangeAbsolute: number | null
  portfolioTotal: number
  marketIndices: MarketIndexDto[]
  topGainers: HoldingMoverDto[]
  topLosers: HoldingMoverDto[]
  sectorBreakdown: SectorBreakdownDto[]
  newsHeadlines: NewsHeadlineDto[]
  briefingText: string
}

export async function getDailyBriefing(): Promise<DailyBriefingResponse> {
  const res = await client.get<DailyBriefingResponse>('/api/briefing/daily')
  return res.data
}
