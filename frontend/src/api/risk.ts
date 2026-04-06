import client from './client'

export interface ConcentrationEntry {
  symbol: string
  label: string | null
  weightPct: number
  exceedsThreshold: boolean
}

export interface DriftEntry {
  symbol: string
  label: string | null
  targetPct: number
  currentPct: number
  driftPct: number
  status: string
}

export interface SectorEntry {
  sector: string
  weightPct: number
  symbols: string[]
  exceedsThreshold: boolean
}

export interface GeographicEntry {
  region: string
  weightPct: number
  symbols: string[]
}

export interface RiskMetricsResponse {
  concentrationRisk: ConcentrationEntry[]
  allocationDrift: DriftEntry[]
  sectorExposure: SectorEntry[]
  geographicExposure: GeographicEntry[]
  portfolioBeta: number | null
  volatilityAnnualizedPct: number | null
  maxDrawdownPct: number | null
  sharpeRatio: number | null
}

export interface RiskWarning {
  type: string
  severity: string
  message: string
  symbol: string | null
  currentValue: number | null
  thresholdValue: number | null
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

export const getRiskMetrics = () =>
  client.get<RiskMetricsResponse>('/api/risk/metrics').then(r => r.data)

export const getRiskWarnings = () =>
  client.get<RiskWarningsResponse>('/api/risk/warnings').then(r => r.data)

export const getRiskThresholds = () =>
  client.get<RiskThresholds>('/api/risk/thresholds').then(r => r.data)

export const updateRiskThresholds = (thresholds: Partial<RiskThresholds>) =>
  client.put<RiskThresholds>('/api/risk/thresholds', thresholds).then(r => r.data)
