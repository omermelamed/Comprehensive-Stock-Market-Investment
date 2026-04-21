import { getPortfolioSummary, getPortfolioHoldings } from '@/api/portfolio'
import { getRiskWarnings } from '@/api/risk'
import { getDailyBriefing } from '@/api/briefing'
import { getAnalytics, getFeesSummary } from '@/api/analytics'
import { getAllocations } from '@/api/allocations'
import { getHoldings } from '@/api/holdings'
import type { HoldingDashboard } from '@/api/portfolio'
import type { RiskWarning } from '@/api/risk'

export interface ChatAction {
  id: string
  label: string
  description: string
  icon: string
  category: 'portfolio' | 'risk' | 'market' | 'planning'
  execute: () => Promise<string>
}

function fmtMoney(n: number, currency = 'ILS'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function severityIcon(s: RiskWarning['severity']): string {
  return s === 'ERROR' ? '🔴' : s === 'WARNING' ? '🟡' : '🔵'
}

async function executePortfolioSummary(): Promise<string> {
  const s = await getPortfolioSummary()
  const lines = [
    `**Portfolio Summary**`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Value | ${fmtMoney(s.totalValue, s.currency)} |`,
    `| Cost Basis | ${fmtMoney(s.totalCostBasis, s.currency)} |`,
    `| P&L | ${fmtMoney(s.totalPnlAbsolute, s.currency)} (${fmtPct(s.totalPnlPercent)}) |`,
    `| Holdings | ${s.holdingCount} |`,
    `| Allocation Health | ${s.allocationHealthScore}/100 |`,
  ]
  return lines.join('\n')
}

async function executeTopHoldings(): Promise<string> {
  const holdings = await getPortfolioHoldings()
  if (!holdings.length) return 'No holdings found. Add some transactions first!'

  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue)
  const top = sorted.slice(0, 8)

  const lines = [
    `**Top Holdings by Value**`,
    ``,
    `| # | Symbol | Value | Weight | P&L |`,
    `|---|--------|-------|--------|-----|`,
    ...top.map((h, i) =>
      `| ${i + 1} | ${h.label ?? h.symbol} | ${fmtMoney(h.currentValue)} | ${h.currentPercent.toFixed(1)}% | ${fmtPct(h.pnlPercent)} |`,
    ),
  ]
  return lines.join('\n')
}

async function executeAllocationDrift(): Promise<string> {
  const holdings = await getPortfolioHoldings()
  const tracked = holdings.filter((h): h is HoldingDashboard & { targetPercent: number } =>
    h.targetPercent != null && h.allocationStatus !== 'UNTRACKED',
  )

  if (!tracked.length) return 'No target allocations set. Go to **Allocations** to configure targets.'

  const needsWork = tracked
    .filter(h => h.allocationStatus !== 'ON_TARGET')
    .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))

  if (!needsWork.length) return '**All positions are on target!** Your allocation looks healthy.'

  const lines = [
    `**Allocation Drift**`,
    ``,
    `| Symbol | Target | Current | Drift | Status |`,
    `|--------|--------|---------|-------|--------|`,
    ...needsWork.map(h =>
      `| ${h.label ?? h.symbol} | ${h.targetPercent.toFixed(1)}% | ${h.currentPercent.toFixed(1)}% | ${fmtPct(h.drift)} | ${h.allocationStatus.replace('_', ' ')} |`,
    ),
    ``,
    `Consider using **Monthly Flow** to bring underweight positions closer to target.`,
  ]
  return lines.join('\n')
}

async function executeRiskCheck(): Promise<string> {
  const { warnings, daysSinceRebalance, lastRebalanceDate } = await getRiskWarnings()

  if (!warnings.length) {
    const base = '**No active risk warnings.** Your portfolio looks healthy.'
    if (daysSinceRebalance != null && daysSinceRebalance > 30) {
      return `${base}\n\n_Note: last rebalance was ${daysSinceRebalance} days ago (${lastRebalanceDate})._`
    }
    return base
  }

  const lines = [
    `**Risk Warnings** (${warnings.length})`,
    ``,
    ...warnings.map(w =>
      `${severityIcon(w.severity)} **${w.type}**${w.symbol ? ` — ${w.symbol}` : ''}: ${w.message}`,
    ),
  ]

  if (daysSinceRebalance != null) {
    lines.push('', `_Last rebalance: ${daysSinceRebalance} days ago (${lastRebalanceDate})._`)
  }

  return lines.join('\n')
}

async function executeDailyBriefing(): Promise<string> {
  const b = await getDailyBriefing()

  const lines = [
    `**Daily Briefing** — ${b.date}`,
    ``,
    `Portfolio: ${fmtMoney(b.portfolioTotal, b.currency)}`,
    b.portfolioChangePercent != null
      ? `Today: ${fmtPct(b.portfolioChangePercent)} (${fmtMoney(b.portfolioChangeAbsolute ?? 0, b.currency)})`
      : `Market is closed`,
    ``,
  ]

  if (b.marketIndices.length) {
    lines.push(`**Market Indices**`)
    b.marketIndices.forEach(idx => {
      lines.push(`- ${idx.label}: ${fmtPct(idx.dayChangePercent)}`)
    })
    lines.push('')
  }

  if (b.topGainers.length) {
    lines.push(`**Top Gainers**: ${b.topGainers.map(g => `${g.symbol} ${fmtPct(g.dayChangePercent)}`).join(', ')}`)
  }
  if (b.topLosers.length) {
    lines.push(`**Top Losers**: ${b.topLosers.map(l => `${l.symbol} ${fmtPct(l.dayChangePercent)}`).join(', ')}`)
  }

  if (b.briefingText) {
    lines.push('', b.briefingText)
  }

  return lines.join('\n')
}

async function executePerformance(): Promise<string> {
  const data = await getAnalytics('1Y')
  const m = data.performanceMetrics

  const lines = [
    `**1-Year Performance**`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Period Return | ${m.costBasisReturnPct != null ? fmtPct(m.costBasisReturnPct) : 'N/A'} |`,
    `| Annualized Return | ${m.annualizedReturnPct != null ? fmtPct(m.annualizedReturnPct) : 'N/A'} |`,
    `| Volatility | ${m.volatilityAnnualizedPct != null ? fmtPct(m.volatilityAnnualizedPct) : 'N/A'} |`,
    `| Max Drawdown | ${m.maxDrawdownPct != null ? m.maxDrawdownPct.toFixed(2) + '%' : 'N/A'} |`,
    `| Sharpe Ratio | ${m.sharpeRatio != null ? m.sharpeRatio.toFixed(2) : 'N/A'} |`,
    `| Snapshots | ${m.snapshotCount} |`,
  ]

  if (data.benchmark) {
    lines.push(``, `Benchmark (${data.benchmark.symbol}): ${fmtPct(data.benchmark.periodReturnPct)}`)
  }

  return lines.join('\n')
}

async function executeFeesSummary(): Promise<string> {
  const fees = await getFeesSummary()

  if (fees.totalFees === 0) return '**No fees recorded.** Your transactions have no associated fees.'

  const lines = [
    `**Fees Summary**`,
    ``,
    `Total fees paid: **${fmtMoney(fees.totalFees)}**`,
    ``,
  ]

  if (fees.symbolFees.length) {
    const topFees = fees.symbolFees.sort((a, b) => b.fees - a.fees).slice(0, 5)
    lines.push(`**By Symbol** (top ${topFees.length})`)
    topFees.forEach(f => lines.push(`- ${f.symbol}: ${fmtMoney(f.fees)}`))
    lines.push('')
  }

  if (fees.monthlyFees.length) {
    const recent = fees.monthlyFees.slice(-3)
    lines.push(`**Recent Months**`)
    recent.forEach(f => lines.push(`- ${f.month}: ${fmtMoney(f.fees)}`))
  }

  return lines.join('\n')
}

async function executeAllocationOverview(): Promise<string> {
  const [allocations, holdings] = await Promise.all([getAllocations(), getHoldings()])

  if (!allocations.length) return 'No target allocations configured. Go to **Allocations** to set up your targets.'

  const nonCategory = allocations.filter(a => !a.isCategory)
  const totalTarget = nonCategory.reduce((s, a) => s + a.targetPercentage, 0)
  const holdingSymbols = new Set(holdings.map(h => h.symbol))

  const lines = [
    `**Allocation Targets**`,
    ``,
    `| Symbol | Target % | In Portfolio |`,
    `|--------|----------|-------------|`,
    ...nonCategory.map(a =>
      `| ${a.label || a.symbol} | ${a.targetPercentage.toFixed(1)}% | ${holdingSymbols.has(a.symbol) ? 'Yes' : 'No'} |`,
    ),
    ``,
    `Total target: **${totalTarget.toFixed(1)}%** ${totalTarget > 100 ? '(over 100%!)' : totalTarget < 100 ? `(${(100 - totalTarget).toFixed(1)}% unallocated)` : ''}`,
  ]
  return lines.join('\n')
}

async function executeBestAndWorst(): Promise<string> {
  const holdings = await getPortfolioHoldings()
  if (holdings.length < 2) return 'Not enough holdings for a comparison.'

  const byPnl = [...holdings].sort((a, b) => b.pnlPercent - a.pnlPercent)
  const best = byPnl.slice(0, 3)
  const worst = byPnl.slice(-3).reverse()

  const lines = [
    `**Best Performers**`,
    ...best.map((h, i) => `${i + 1}. **${h.label ?? h.symbol}** — ${fmtPct(h.pnlPercent)} (${fmtMoney(h.pnlAbsolute)})`),
    ``,
    `**Worst Performers**`,
    ...worst.map((h, i) => `${i + 1}. **${h.label ?? h.symbol}** — ${fmtPct(h.pnlPercent)} (${fmtMoney(h.pnlAbsolute)})`),
  ]
  return lines.join('\n')
}

export const CHAT_ACTIONS: ChatAction[] = [
  {
    id: 'portfolio-summary',
    label: 'Portfolio Summary',
    description: 'Total value, P&L, and health score',
    icon: 'briefcase',
    category: 'portfolio',
    execute: executePortfolioSummary,
  },
  {
    id: 'top-holdings',
    label: 'Top Holdings',
    description: 'Largest positions by value',
    icon: 'bar-chart',
    category: 'portfolio',
    execute: executeTopHoldings,
  },
  {
    id: 'best-worst',
    label: 'Best & Worst',
    description: 'Top and bottom performers by P&L',
    icon: 'trending-up',
    category: 'portfolio',
    execute: executeBestAndWorst,
  },
  {
    id: 'allocation-drift',
    label: 'Allocation Drift',
    description: 'Positions that need rebalancing',
    icon: 'pie-chart',
    category: 'planning',
    execute: executeAllocationDrift,
  },
  {
    id: 'allocation-overview',
    label: 'Allocation Targets',
    description: 'Your target allocation setup',
    icon: 'target',
    category: 'planning',
    execute: executeAllocationOverview,
  },
  {
    id: 'risk-check',
    label: 'Risk Check',
    description: 'Active warnings and risk alerts',
    icon: 'shield',
    category: 'risk',
    execute: executeRiskCheck,
  },
  {
    id: 'daily-briefing',
    label: 'Daily Briefing',
    description: 'Market overview and portfolio movers',
    icon: 'newspaper',
    category: 'market',
    execute: executeDailyBriefing,
  },
  {
    id: 'performance',
    label: '1Y Performance',
    description: 'Return, volatility, and Sharpe ratio',
    icon: 'activity',
    category: 'portfolio',
    execute: executePerformance,
  },
  {
    id: 'fees-summary',
    label: 'Fees Paid',
    description: 'Total fees by symbol and month',
    icon: 'receipt',
    category: 'portfolio',
    execute: executeFeesSummary,
  },
]
