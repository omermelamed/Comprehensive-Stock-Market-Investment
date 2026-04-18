/**
 * Fixed test data for deterministic E2E testing.
 * All monetary values use these fixed prices and rates.
 */

export const MOCK_EXCHANGE_RATES = {
  USD_TO_ILS: 3.70,
  USD_TO_EUR: 0.92,
  USD_TO_GBP: 0.79,
  ILS_TO_USD: 0.27,
  EUR_TO_USD: 1.087,
  GBP_TO_USD: 1.266,
  ILS_TO_EUR: 0.249,
  ILS_TO_GBP: 0.213,
} as const

export const MOCK_STOCK_PRICES: Record<string, { price_usd: number; change_24h_pct: number }> = {
  VOO:      { price_usd: 220.00, change_24h_pct: 0.51  },
  VXUS:     { price_usd: 58.00,  change_24h_pct: -0.23 },
  REIT_ETF: { price_usd: 42.00,  change_24h_pct: 0.12  },
  BND:      { price_usd: 74.00,  change_24h_pct: -0.05 },
  STOCKS:   { price_usd: 155.00, change_24h_pct: 1.20  },
  TA125:    { price_usd: 32.00,  change_24h_pct: 0.33  },
  SPY:      { price_usd: 510.00, change_24h_pct: 0.45  },
}

export const BASE_USER_PROFILE = {
  displayName: 'Test User',
  preferredCurrency: 'ILS',
  riskLevel: 'AGGRESSIVE',
  timeHorizonYears: 20,
  monthlyInvestmentMin: 3000,
  monthlyInvestmentMax: 6000,
  investmentGoal: 'Family wealth',
  tracksEnabled: ['LONG_EQUITY', 'REIT', 'BOND'],
  timezone: 'Asia/Jerusalem',
  theme: 'DARK',
  questionnaireAnswers: { experience: 3, horizon: 3, reaction: 3 },
  telegramChatId: null,
  telegramEnabled: false,
}

export const BASE_TARGET_ALLOCATIONS = [
  { symbol: 'VOO',      assetType: 'ETF',   targetPercentage: 45, label: 'US Market',          displayOrder: 1 },
  { symbol: 'VXUS',     assetType: 'ETF',   targetPercentage: 20, label: 'International',      displayOrder: 2 },
  { symbol: 'REIT_ETF', assetType: 'REIT',  targetPercentage: 10, label: 'Real Estate',        displayOrder: 3 },
  { symbol: 'BND',      assetType: 'BOND',  targetPercentage: 10, label: 'Bonds',              displayOrder: 4 },
  { symbol: 'STOCKS',   assetType: 'STOCK', targetPercentage: 10, label: 'Individual Stocks',  displayOrder: 5 },
  { symbol: 'TA125',    assetType: 'ETF',   targetPercentage: 5,  label: 'Israeli Market',     displayOrder: 6 },
]

export const BASE_TRANSACTIONS = [
  { symbol: 'VOO',      type: 'BUY', track: 'LONG_EQUITY', quantity: 100, pricePerUnit: 200.00 },
  { symbol: 'VXUS',     type: 'BUY', track: 'LONG_EQUITY', quantity: 200, pricePerUnit: 55.00  },
  { symbol: 'REIT_ETF', type: 'BUY', track: 'LONG_EQUITY', quantity: 50,  pricePerUnit: 40.00  },
  { symbol: 'BND',      type: 'BUY', track: 'LONG_EQUITY', quantity: 100, pricePerUnit: 75.00  },
  { symbol: 'STOCKS',   type: 'BUY', track: 'LONG_EQUITY', quantity: 30,  pricePerUnit: 150.00 },
  { symbol: 'TA125',    type: 'BUY', track: 'LONG_EQUITY', quantity: 80,  pricePerUnit: 30.00  },
]

/**
 * Expected portfolio state derived from BASE_TRANSACTIONS + MOCK_STOCK_PRICES
 */
export const EXPECTED_PORTFOLIO = {
  positions: {
    VOO:      { qty: 100, costBasis: 20_000, currentValueUsd: 22_000 },
    VXUS:     { qty: 200, costBasis: 11_000, currentValueUsd: 11_600 },
    REIT_ETF: { qty: 50,  costBasis: 2_000,  currentValueUsd: 2_100  },
    BND:      { qty: 100, costBasis: 7_500,  currentValueUsd: 7_400  },
    STOCKS:   { qty: 30,  costBasis: 4_500,  currentValueUsd: 4_650  },
    TA125:    { qty: 80,  costBasis: 2_400,  currentValueUsd: 2_560  },
  },
  totalValueUsd: 50_310,
  totalValueIls: 50_310 * 3.70,  // ₪186,147
  totalCostBasis: 47_400,
} as const

/**
 * Expected allocation percentages at current prices
 */
export const EXPECTED_ALLOCATION_PCT = {
  VOO:      22_000 / 50_310 * 100,  // ~43.73%
  VXUS:     11_600 / 50_310 * 100,  // ~23.06%
  REIT_ETF: 2_100  / 50_310 * 100,  // ~4.17%
  BND:      7_400  / 50_310 * 100,  // ~14.71%
  STOCKS:   4_650  / 50_310 * 100,  // ~9.24%
  TA125:    2_560  / 50_310 * 100,  // ~5.09%
} as const

/**
 * Expected gap calculations for monthly flow (ILS)
 */
export function computeExpectedGaps(portfolioTotalIls: number) {
  const targets: Record<string, number> = {
    VOO: 45, VXUS: 20, REIT_ETF: 10, BND: 10, STOCKS: 10, TA125: 5,
  }
  const currentValues: Record<string, number> = {
    VOO:      22_000 * 3.70,
    VXUS:     11_600 * 3.70,
    REIT_ETF: 2_100  * 3.70,
    BND:      7_400  * 3.70,
    STOCKS:   4_650  * 3.70,
    TA125:    2_560  * 3.70,
  }

  const gaps: Record<string, { targetValue: number; currentValue: number; gap: number; status: string }> = {}
  for (const [sym, pct] of Object.entries(targets)) {
    const targetValue = portfolioTotalIls * (pct / 100)
    const currentValue = currentValues[sym]
    const gap = targetValue - currentValue
    gaps[sym] = {
      targetValue,
      currentValue,
      gap,
      status: gap > 0 ? 'UNDERWEIGHT' : gap < 0 ? 'OVERWEIGHT' : 'ON_TARGET',
    }
  }
  return gaps
}

/**
 * Expected monthly flow suggested amounts for a given budget (ILS)
 */
export function computeExpectedSuggestions(budgetIls: number, portfolioTotalIls: number) {
  const gaps = computeExpectedGaps(portfolioTotalIls)
  const positiveGaps: Record<string, number> = {}
  let totalPositiveGap = 0

  for (const [sym, data] of Object.entries(gaps)) {
    if (data.gap > 0) {
      positiveGaps[sym] = data.gap
      totalPositiveGap += data.gap
    }
  }

  const suggestions: Record<string, number> = {}
  for (const [sym] of Object.entries(gaps)) {
    if (positiveGaps[sym]) {
      suggestions[sym] = budgetIls * (positiveGaps[sym] / totalPositiveGap)
    } else {
      suggestions[sym] = 0
    }
  }

  return { suggestions, positiveGaps, totalPositiveGap }
}
