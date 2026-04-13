import client from './client'

export interface OptionsPosition {
  id: string
  underlyingSymbol: string
  optionType: 'CALL' | 'PUT'
  action: 'BUY' | 'SELL'
  strikePrice: number
  expirationDate: string
  contracts: number
  premiumPerContract: number
  totalPremium: number
  currentPremium: number | null
  pnl: number | null
  pnlPercent: number | null
  daysToExpiry: number
  status: 'ACTIVE' | 'EXPIRED' | 'EXERCISED' | 'CLOSED'
  notes: string | null
  executedAt: string
  createdAt: string
}

export interface OptionsListResponse {
  positions: OptionsPosition[]
  optionsTrackEnabled: boolean
}

export interface CreateOptionsPositionRequest {
  underlyingSymbol: string
  optionType: 'CALL' | 'PUT'
  action: 'BUY' | 'SELL'
  strikePrice: number
  expirationDate: string
  contracts: number
  premiumPerContract: number
  notes?: string
}

export interface OptionStrategyContractDetails {
  optionType: 'CALL' | 'PUT'
  suggestedStrike: number
  suggestedExpiry: string
  estimatedPremium: number
  maxLoss: number
  breakeven: number
}

export interface OptionsStrategy {
  symbol: string
  strategyName: string
  reasoning: string
  contractDetails: OptionStrategyContractDetails | null
  greeksUnavailable: boolean
  earningsWarning: string | null
}

export async function getOptionsPositions(): Promise<OptionsListResponse> {
  const res = await client.get<OptionsListResponse>('/api/options')
  return res.data
}

export async function createOptionsPosition(data: CreateOptionsPositionRequest): Promise<OptionsPosition> {
  const res = await client.post<OptionsPosition>('/api/options', data)
  return res.data
}

export async function updateOptionsStatus(
  id: string,
  status: 'EXPIRED' | 'EXERCISED' | 'CLOSED',
): Promise<OptionsPosition> {
  const res = await client.put<OptionsPosition>(`/api/options/${id}/status`, { status })
  return res.data
}

export async function deleteOptionsPosition(id: string): Promise<void> {
  await client.delete(`/api/options/${id}`)
}

export async function getOptionsStrategy(symbol: string): Promise<OptionsStrategy> {
  const res = await client.get<OptionsStrategy>(`/api/options/${symbol}/strategy`)
  return res.data
}
