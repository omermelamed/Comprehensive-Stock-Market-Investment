export const CURRENCIES = [
  { value: 'USD', symbol: '$',  label: 'USD' },
  { value: 'ILS', symbol: '₪', label: 'ILS' },
  { value: 'EUR', symbol: '€',  label: 'EUR' },
  { value: 'GBP', symbol: '£',  label: 'GBP' },
] as const

export const GOAL_CHIPS = ['Retirement', 'Passive income', 'Wealth growth'] as const

export const HORIZONS = [
  { value: 1,  label: '< 1 yr' },
  { value: 3,  label: '1-3 yrs' },
  { value: 7,  label: '3-7 yrs' },
  { value: 15, label: '7-15 yrs' },
  { value: 25, label: '15+ yrs' },
] as const

export const HORIZON_STRATEGY: Record<number, { title: string; rec: string }> = {
  1:  { title: 'Short-term investor', rec: '(recommended strategy: preservation)' },
  3:  { title: 'Near-term investor',  rec: '(recommended strategy: balanced)' },
  7:  { title: 'Medium-term investor', rec: '(recommended strategy: growth)' },
  15: { title: 'Long-term investor',  rec: '(recommended strategy: accumulation)' },
  25: { title: 'Long-term investor',  rec: '(recommended strategy: accumulation)' },
}

export const ASSET_TRACKS = [
  { value: 'LONG_EQUITY', label: 'ETF',     desc: 'Always on',               icon: 'TrendingUp',  color: '#22C55E', locked: true },
  { value: 'CRYPTO',      label: 'Crypto',  desc: 'Volatile digital assets', icon: 'Coins',       color: '#F59E0B', locked: false },
  { value: 'REIT',        label: 'REITS',   desc: 'Real estate portfolios',  icon: 'Building2',   color: '#3B82F6', locked: false },
  { value: 'BOND',        label: 'Bonds',   desc: 'Stability and income',    icon: 'Shield',      color: '#10B981', locked: false },
  { value: 'OPTIONS',     label: 'Options', desc: 'Options strategies',       icon: 'Settings',    color: '#8B5CF6', locked: false },
  { value: 'SHORT',       label: 'Short',   desc: 'Short selling',           icon: 'BarChart3',   color: '#6B7280', locked: false },
] as const
