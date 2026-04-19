// frontend/src/features/briefing/BriefingHero.tsx
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import type { DailyBriefingResponse, MarketIndexDto } from '@/api/briefing'

function IndexPill({ idx }: { idx: MarketIndexDto }) {
  const positive = idx.dayChangePercent >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums',
        positive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
      )}
    >
      {idx.label} {positive ? '▲' : '▼'}{Math.abs(idx.dayChangePercent).toFixed(2)}%
    </span>
  )
}

interface Props {
  data: DailyBriefingResponse
}

export function BriefingHero({ data }: Props) {
  const positive = data.portfolioChangePercent == null || data.portfolioChangePercent >= 0

  return (
    <div className="rounded-xl border border-border bg-card px-6 py-5 space-y-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Today's Portfolio Change
        </p>
        {data.portfolioChangePercent != null && (
          <span
            className={cn(
              'font-mono text-2xl font-bold tabular-nums',
              positive ? 'text-success' : 'text-destructive',
            )}
          >
            {positive ? '+' : ''}{data.portfolioChangePercent.toFixed(2)}%
          </span>
        )}
        {data.portfolioChangeAbsolute != null && (
          <span className={cn('font-mono text-sm tabular-nums', positive ? 'text-success' : 'text-destructive')}>
            ({positive ? '+' : ''}{formatMoney(data.portfolioChangeAbsolute, data.currency)})
          </span>
        )}
      </div>
      {data.marketIndices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.marketIndices.map(idx => (
            <IndexPill key={idx.symbol} idx={idx} />
          ))}
        </div>
      )}
    </div>
  )
}
