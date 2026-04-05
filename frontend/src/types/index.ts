export interface UserProfile {
  id: number
  displayName: string
  preferredCurrency: string
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  tracksEnabled: string[]
  monthlyInvestmentMin: number
  monthlyInvestmentMax: number
  investmentGoal: string
  timeHorizonYears: number
  questionnaireAnswers: Record<string, number>
  theme: string
  onboardingCompleted: boolean
}

export interface TargetAllocation {
  id: number
  symbol: string
  assetType: string
  targetPercentage: number
  label: string
  displayOrder: number
}

export interface Transaction {
  id: number
  symbol: string
  transactionType: 'BUY' | 'SELL' | 'SHORT' | 'COVER' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL'
  quantity: number
  pricePerUnit: number
  totalAmount: number
  fees: number
  currency: string
  transactionDate: string
  notes: string | null
  track: string
}

export interface Holding {
  symbol: string
  track: string
  netQuantity: number
  avgBuyPrice: number
  totalCostBasis: number
}

export interface PositionCard {
  symbol: string
  label: string | null
  targetPercent: number
  currentPercent: number
  currentValue: number
  gapPercent: number
  gapValue: number
  suggestedAmount: number
  status: 'UNDERWEIGHT' | 'ON_TARGET' | 'OVERWEIGHT'
  aiSummary?: string
}

export interface MonthlyFlowPreview {
  portfolioTotal: number
  budget: number
  positions: PositionCard[]
  missingPrices: string[]
}

export interface MonthlyFlowConfirmResult {
  totalInvested: number
  transactionsCreated: number
}

export interface WatchlistAnalysisSections {
  valuation: string
  momentum: string
  financialHealth: string
  growth: string
  sentiment: string
}

export interface WatchlistItem {
  id: string
  symbol: string
  companyName: string | null
  assetType: string
  signal: 'GOOD_BUY_NOW' | 'NOT_YET' | 'WAIT_FOR_DIP' | 'PENDING'
  signalSummary: string | null
  fullAnalysis: {
    signal: string
    summary: string
    sections: WatchlistAnalysisSections
  } | null
  lastAnalyzedAt: string | null
  addedAt: string
}

export interface RecommendationCard {
  rank: number
  symbol: string
  action: string
  source: 'ALLOCATION_GAP' | 'WATCHLIST' | 'AI_SUGGESTION'
  reason: string
  suggestedAmount: number | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface PortfolioContextSummary {
  totalValue: number
  currency: string
  monthlyBudget: number
  riskLevel: string
  tracksEnabled: string[]
}

export interface RecommendationsResponse {
  recommendations: RecommendationCard[]
  generatedAt: string
  expiresAt: string
  portfolioContext: PortfolioContextSummary
}
