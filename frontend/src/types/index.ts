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
