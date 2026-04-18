import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PortfolioSummary } from '@/api/portfolio'
import { formatMoney } from '@/lib/currency'

function formatCurrency(value: number, currency = 'USD'): string {
  return formatMoney(value, currency)
}

function formatPnl(value: number, currency = 'USD'): string {
  const formatted = formatMoney(Math.abs(value), currency)
  return value >= 0 ? `+${formatted}` : `-${formatted}`
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

interface AllocationHealthBadgeProps {
  score: number
}

function AllocationHealthBadge({ score }: AllocationHealthBadgeProps) {
  if (score < 5) {
    return (
      <Badge variant="success" className="gap-1">
        <Activity className="h-3 w-3" />
        Healthy
      </Badge>
    )
  }
  if (score < 15) {
    return (
      <Badge variant="warning" className="gap-1">
        <Activity className="h-3 w-3" />
        Slight drift
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <Activity className="h-3 w-3" />
      Needs rebalancing
    </Badge>
  )
}

interface Props {
  summary: PortfolioSummary
}

export function PortfolioSummaryCard({ summary }: Props) {
  const isPnlPositive = summary.totalPnlAbsolute >= 0

  return (
    <Card className="overflow-hidden">
      {/* Hero section — gradient accent for the main number */}
      <div className="bg-gradient-to-br from-primary/8 via-primary/4 to-transparent px-6 pt-6 pb-5 border-b border-border/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {/* Total value block */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Portfolio Value
            </p>
            <p className="tabular-nums font-mono text-4xl font-bold tracking-tight">
              {formatCurrency(summary.totalValue, summary.currency)}
            </p>

            {/* P&L row */}
            <div className="flex items-center gap-2 pt-0.5">
              {isPnlPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  'tabular-nums font-mono text-sm font-semibold',
                  isPnlPositive ? 'text-success' : 'text-destructive',
                )}
              >
                {formatPnl(summary.totalPnlAbsolute, summary.currency)}
              </span>
              <span
                className={cn(
                  'tabular-nums text-sm',
                  isPnlPositive ? 'text-success' : 'text-destructive',
                )}
              >
                ({formatPercent(summary.totalPnlPercent)})
              </span>
            </div>
          </div>

          {/* CTA — aligned to bottom of hero */}
          <Link
            to="/monthly-flow"
            className={cn(buttonVariants({ variant: 'default' }), 'shrink-0')}
          >
            Invest This Month
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center gap-8">
          <div>
            <p className="text-xs text-muted-foreground">Positions</p>
            <p className="tabular-nums font-mono text-sm font-semibold">{summary.holdingCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cost Basis</p>
            <p className="tabular-nums font-mono text-sm font-semibold">
              {formatCurrency(summary.totalCostBasis, summary.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Allocation Health</p>
            <div className="mt-0.5">
              <AllocationHealthBadge score={summary.allocationHealthScore} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
