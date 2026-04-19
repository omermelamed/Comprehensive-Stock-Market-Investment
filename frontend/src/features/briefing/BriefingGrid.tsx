// frontend/src/features/briefing/BriefingGrid.tsx
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import type { DailyBriefingResponse } from '@/api/briefing'

interface Props {
  data: DailyBriefingResponse
}

function MoverRow({ symbol, dayChangePercent, portfolioValue, currency }: {
  symbol: string
  dayChangePercent: number
  portfolioValue: number
  currency: string
}) {
  const positive = dayChangePercent >= 0
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="font-semibold text-sm text-foreground">{symbol}</span>
      <div className="text-right">
        <p className={cn('font-mono text-sm font-semibold tabular-nums', positive ? 'text-success' : 'text-destructive')}>
          {positive ? '+' : ''}{dayChangePercent.toFixed(2)}%
        </p>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatMoney(portfolioValue, currency)}
        </p>
      </div>
    </div>
  )
}

export function BriefingGrid({ data }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Top Gainers */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Gainers</h3>
        {data.topGainers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data</p>
        ) : (
          data.topGainers.map(g => (
            <MoverRow
              key={g.symbol}
              symbol={g.symbol}
              dayChangePercent={g.dayChangePercent}
              portfolioValue={g.portfolioValue}
              currency={data.currency}
            />
          ))
        )}
      </div>

      {/* Top Losers */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Losers</h3>
        {data.topLosers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data</p>
        ) : (
          data.topLosers.map(l => (
            <MoverRow
              key={l.symbol}
              symbol={l.symbol}
              dayChangePercent={l.dayChangePercent}
              portfolioValue={l.portfolioValue}
              currency={data.currency}
            />
          ))
        )}
      </div>

      {/* Sector Breakdown */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sector Breakdown</h3>
        {data.sectorBreakdown.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data</p>
        ) : (
          data.sectorBreakdown.map(s => (
            <div key={s.sector} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
              <span className="text-sm text-foreground">{s.sector}</span>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">{s.portfolioPercent.toFixed(1)}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
