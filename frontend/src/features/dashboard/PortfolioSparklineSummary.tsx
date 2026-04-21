import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import type { PortfolioHistory } from '@/api/portfolio'
import { chart, recharts } from '@/lib/chart-theme'
import { useCurrency } from '@/contexts/currency-context'
import { formatMoney } from '@/lib/currency'
import { cn } from '@/lib/utils'

interface Props {
  history: PortfolioHistory | null
  historyRange: string
  loading?: boolean
}

export function PortfolioSparklineSummary({ history, historyRange, loading }: Props) {
  const currency = useCurrency()

  const { data, pctChange, isUp } = useMemo(() => {
    if (!history?.points?.length) {
      return {
        data: [] as { date: string; value: number }[],
        pctChange: null as number | null,
        isUp: null as boolean | null,
      }
    }
    const pts = history.points.map(p => ({ date: p.date, value: p.totalValue }))
    const first = pts[0].value
    const last = pts[pts.length - 1].value
    if (first === 0) return { data: pts, pctChange: null, isUp: null }
    const pct = ((last - first) / first) * 100
    return { data: pts, pctChange: pct, isUp: pct >= 0 }
  }, [history])

  if (loading && !history) {
    return <div className="h-20 animate-pulse rounded-xl border border-border bg-muted/50" />
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">No portfolio history for a sparkline yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-sm font-semibold text-foreground">Portfolio trend</h2>
            <span className="text-xs tabular-nums text-muted-foreground">{historyRange}</span>
          </div>
          {pctChange !== null && (
            <p
              className={cn(
                'mt-0.5 font-mono text-xs font-medium tabular-nums',
                isUp ? 'text-success' : 'text-destructive',
              )}
            >
              {isUp ? '+' : ''}
              {pctChange.toFixed(2)}% over period
            </p>
          )}
          <Link to="/analytics" className="mt-1 inline-block text-xs text-primary hover:underline">
            Holdings performance & analytics →
          </Link>
        </div>
        <div className="h-14 w-full shrink-0 sm:w-44 md:w-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Tooltip
                contentStyle={recharts.tooltip.contentStyle}
                labelStyle={recharts.tooltip.labelStyle}
                formatter={(v: number) => [formatMoney(v, currency), 'Value']}
                labelFormatter={(label) => String(label)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={chart.primary}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
