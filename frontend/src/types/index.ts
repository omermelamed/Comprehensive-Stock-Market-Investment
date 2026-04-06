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
  fundamentals?: FundamentalsData | null
  aiSummary?: string
  aiSentiment?: 'POSITIVE' | 'NEUTRAL' | 'CAUTIOUS'
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
    confidenceScore?: number
    sources?: string[]
  } | null
  confidenceScore: number | null
  lastAnalyzedAt: string | null
  addedAt: string
}

export interface WatchlistMetrics {
  symbol: string
  currentPrice: number | null
  currency: string
  fundamentals: FundamentalsData | null
}

export interface Alert {
  id: string
  symbol: string
  condition: 'ABOVE' | 'BELOW'
  thresholdPrice: number
  note: string | null
  isActive: boolean
  triggeredAt: string | null
  createdAt: string
}

export interface FundamentalsData {
  peRatio: number | null
  pegRatio: number | null
  eps: number | null
  dividendYield: number | null
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  marketCap: string | null
}

export interface RecommendationCard {
  rank: number
  symbol: string
  action: 'BUY' | 'SHORT' | 'COVERED_CALL'
  source: 'ALLOCATION_GAP' | 'WATCHLIST' | 'AI_SUGGESTION'
  reason: string
  suggestedAmount: number | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  targetPrice?: number | null           // optional — Claude 12-month target
  expectedReturnPercent?: number | null // deterministic — vs current when both known
  currentPrice: number | null      // deterministic — from market data
  timeHorizon: string | null       // advisory — Claude's suggested holding period
  catalysts: string[] | null       // advisory — Claude's 2-3 key reasons
  fundamentals: FundamentalsData | null  // deterministic — from Alpha Vantage
  sourceUrl: string | null         // deterministic — Yahoo Finance quote URL
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
  /** null on success; 'claude_failure' | 'parse_failure' on generation error */
  generationError: string | null
}
