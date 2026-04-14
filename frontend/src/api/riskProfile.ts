import client from './client'

export interface RiskHistoryEntry {
  id: string
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  aiInferredScore: number | null
  reasoning: string
  trigger: 'MANUAL' | 'AUTO' | 'ONBOARDING'
  transactionCountAtUpdate: number
  createdAt: string
}

export interface RiskEvaluationResult {
  riskLevel: string
  aiInferredScore: number
  reasoning: string
  trigger: string
}

export const getRiskHistory = (): Promise<RiskHistoryEntry[]> =>
  client.get<RiskHistoryEntry[]>('/api/profile/risk-history').then(r => r.data)

export const triggerRiskEvaluation = (): Promise<RiskEvaluationResult> =>
  client.post<RiskEvaluationResult>('/api/profile/risk/evaluate').then(r => r.data)
