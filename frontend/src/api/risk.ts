import client from './client'

export interface ConcentrationRiskItem {
  symbol: string
  label: string | null
  weightPct: number
  exceedsThreshold: boolean
}

export interface AllocationDriftItem {
  symbol: string
  label: string | null
  targetPct: number
  currentPct: number
  driftPct: number
  status: 'ON_TARGET' | 'UNDERWEIGHT' | 'OVERWEIGHT'
}

export interface SectorExposureItem {
  sector: string
  weightPct: number
  symbols: string[]
  exceedsThreshold: boolean
}

export interface GeographicExposureItem {
  region: string
  weightPct: number
  symbols: string[]
}

export interface RiskMetrics {
  concentrationRisk: ConcentrationRiskItem[]
  allocationDrift: AllocationDriftItem[]
  sectorExposure: SectorExposureItem[]
  geographicExposure: GeographicExposureItem[]
  portfolioBeta: number | null
  volatilityAnnualizedPct: number | null
  maxDrawdownPct: number | null
  sharpeRatio: number | null
}

export interface RiskWarning {
  type: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
  message: string
  symbol?: string
  currentValue?: number
  thresholdValue?: number
}

export interface RiskWarningsResponse {
  warnings: RiskWarning[]
  lastRebalanceDate: string | null
  daysSinceRebalance: number | null
}

export interface RiskThresholds {
  maxSinglePositionPct: number
  maxSectorPct: number
  maxDrawdownPct: number
  driftWarningPct: number
  rebalanceReminderDays: number
}

export async function getRiskMetrics(): Promise<RiskMetrics> {
  const res = await client.get<RiskMetrics>('/api/risk/metrics')
  return res.data
}

export async function getRiskWarnings(): Promise<RiskWarningsResponse> {
  const res = await client.get<RiskWarningsResponse>('/api/risk/warnings')
  return res.data
}

export async function getRiskThresholds(): Promise<RiskThresholds> {
  const res = await client.get<RiskThresholds>('/api/risk/thresholds')
  return res.data
}

export async function updateRiskThresholds(data: Partial<RiskThresholds>): Promise<RiskThresholds> {
  const res = await client.put<RiskThresholds>('/api/risk/thresholds', data)
  return res.data
}
