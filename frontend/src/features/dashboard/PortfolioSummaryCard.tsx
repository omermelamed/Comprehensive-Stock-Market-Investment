import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PortfolioSummary } from '@/api/portfolio'

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPnl(value: number, currency = 'USD'): string {
  const formatted = formatCurrency(Math.abs(value), currency)
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
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Total value block */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Total Portfolio Value</p>
            <p className="font-mono text-4xl font-bold tracking-tight">
              {formatCurrency(summary.totalValue, summary.currency)}
            </p>

            {/* P&L row */}
            <div className="flex items-center gap-2 pt-1">
              {isPnlPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  'font-mono text-sm font-semibold',
                  isPnlPositive ? 'text-success' : 'text-destructive',
                )}
              >
                {formatPnl(summary.totalPnlAbsolute, summary.currency)}
              </span>
              <span
                className={cn(
                  'text-sm',
                  isPnlPositive ? 'text-success' : 'text-destructive',
                )}
              >
                ({formatPercent(summary.totalPnlPercent)})
              </span>
            </div>
          </div>

          {/* Right block: stats + CTA */}
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <div className="flex flex-wrap gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Positions</p>
                <p className="font-mono text-sm font-semibold">{summary.holdingCount}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Cost Basis</p>
                <p className="font-mono text-sm font-semibold">
                  {formatCurrency(summary.totalCostBasis, summary.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Allocation Health</p>
                <div className="mt-0.5 flex justify-end">
                  <AllocationHealthBadge score={summary.allocationHealthScore} />
                </div>
              </div>
            </div>

            <Link
              to="/monthly-flow"
              className={cn(buttonVariants({ variant: 'default' }), 'w-full sm:w-auto')}
            >
              Invest This Month
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
