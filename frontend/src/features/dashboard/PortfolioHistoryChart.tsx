import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { PortfolioHistory } from '@/api/portfolio'
import { UniversalChart } from '@/components/charts'
import { chart } from '@/lib/chart-theme'
import { useCurrency } from '@/contexts/currency-context'
import { formatMoney } from '@/lib/currency'

const TIMEFRAMES = ['1W', '1M', '3M', '6M', '1Y', 'ALL'] as const

interface Props {
  history: PortfolioHistory | null
  historyRange: string
  onRangeChange: (range: string) => void
  loading?: boolean
}

export function PortfolioHistoryChart({ history, historyRange, onRangeChange, loading }: Props) {
  const currency = useCurrency()

  const chartData = useMemo(() => {
    if (!history) return []
    return history.points.map(p => ({
      date: p.date,
      value: p.totalValue,
    }))
  }, [history])

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Portfolio History</h2>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => onRangeChange(tf)}
                className={[
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  historyRange === tf
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-[220px] animate-pulse rounded-xl bg-muted" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No history data available.</p>
          </div>
        ) : (
          <UniversalChart
            chartId="dashboard-portfolio-history"
            timeSeries={{
              data: chartData,
              xDataKey: 'date',
              series: [{ dataKey: 'value', name: 'Portfolio Value', color: chart.primary, strokeWidth: 2 }],
              xTickFormatter: (d) => d.slice(5),
              yTickFormatter: (v) => formatMoney(v, currency),
              showLegend: false,
            }}
            defaultType="area"
            allowedTypes={['area', 'line', 'bar']}
            height={220}
          />
        )}
      </CardContent>
    </Card>
  )
}
