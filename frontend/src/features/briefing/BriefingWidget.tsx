// frontend/src/features/briefing/BriefingWidget.tsx
import { Link } from 'react-router-dom'
import { Newspaper } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import { useBriefing } from './useBriefing'

function IndexPill({ symbol, dayChangePercent }: { symbol: string; dayChangePercent: number }) {
  const positive = dayChangePercent >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        positive
          ? 'bg-success/15 text-success'
          : 'bg-destructive/15 text-destructive',
      )}
    >
      {symbol} {positive ? '▲' : '▼'}{Math.abs(dayChangePercent).toFixed(2)}%
    </span>
  )
}

export function BriefingWidget() {
  const { data, loading } = useBriefing()

  if (loading) {
    return <div className="h-16 animate-pulse rounded-xl bg-muted" />
  }

  if (!data) return null

  const changePercent = data.portfolioChangePercent
  const changeAbsolute = data.portfolioChangeAbsolute
  const positive = changePercent == null || changePercent >= 0
  const topGainer = data.topGainers[0] ?? null
  const topLoser = data.topLosers[0] ?? null

  return (
    <Card className="px-4 py-3 space-y-2">
      {/* Row 1: title + portfolio Δ + link */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Daily Briefing</span>
          {changePercent != null && (
            <span
              className={cn(
                'tabular-nums font-mono text-sm font-bold',
                positive ? 'text-success' : 'text-destructive',
              )}
            >
              {positive ? '▲' : '▼'} {positive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          )}
          {changeAbsolute != null && (
            <span className="text-xs text-muted-foreground tabular-nums font-mono">
              ({positive ? '+' : ''}{formatMoney(changeAbsolute, data.currency)})
            </span>
          )}
        </div>
        <Link
          to="/briefing"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          View full →
        </Link>
      </div>

      {/* Row 2: market index pills */}
      {data.marketIndices.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.marketIndices.map(idx => (
            <IndexPill key={idx.symbol} symbol={idx.symbol} dayChangePercent={idx.dayChangePercent} />
          ))}
        </div>
      )}

      {/* Row 3: top mover pair */}
      {(topGainer || topLoser) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {topGainer && (
            <span>
              ↑ <span className="font-semibold text-success">{topGainer.symbol} +{topGainer.dayChangePercent.toFixed(2)}%</span>
            </span>
          )}
          {topLoser && (
            <span>
              ↓ <span className="font-semibold text-destructive">{topLoser.symbol} {topLoser.dayChangePercent.toFixed(2)}%</span>
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
