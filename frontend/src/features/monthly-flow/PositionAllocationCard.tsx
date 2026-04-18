import { cn } from '@/lib/utils'
import type { PositionCard } from '@/types'
import { useCurrency } from '@/contexts/currency-context'
import { formatMoney, getCurrencySymbol } from '@/lib/currency'
import { MetricBadges } from './MetricBadge'

function fmtPct(value: number): string {
  return `${value.toFixed(2)}%`
}

const STATUS_STYLES: Record<PositionCard['status'], string> = {
  UNDERWEIGHT: 'bg-success/15 text-success border-success/30',
  ON_TARGET: 'bg-warning/15 text-warning border-warning/30',
  OVERWEIGHT: 'bg-destructive/15 text-destructive border-destructive/30',
}

const STATUS_LABELS: Record<PositionCard['status'], string> = {
  UNDERWEIGHT: 'Underweight',
  ON_TARGET: 'On target',
  OVERWEIGHT: 'Overweight',
}

interface Props {
  position: PositionCard
  amount: string
  onAmountChange: (value: string) => void
  isLoadingSummary?: boolean
}

export function PositionAllocationCard({ position, amount, onAmountChange, isLoadingSummary }: Props) {
  const currency = useCurrency()
  const fmt = (v: number) => formatMoney(v, currency)
  const sym = getCurrencySymbol(currency)
  const isEditable = position.status === 'UNDERWEIGHT'

  const fillPct = Math.min(100, (position.currentPercent / Math.max(position.targetPercent, 0.01)) * 100)

  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-base font-bold text-card-foreground leading-tight">{position.symbol}</p>
          {position.label && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{position.label}</p>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
            STATUS_STYLES[position.status],
          )}
        >
          {STATUS_LABELS[position.status]}
        </span>
      </div>

      {/* Allocation progress */}
      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Current {fmtPct(position.currentPercent)}</span>
          <span>Target {fmtPct(position.targetPercent)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              position.status === 'OVERWEIGHT' ? 'bg-destructive' : 'bg-primary',
            )}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          { label: 'Price', value: position.currentPrice != null ? fmt(position.currentPrice) : '—' },
          { label: 'Value', value: fmt(position.currentValue) },
          { label: 'Gap', value: `${position.gapValue >= 0 ? '+' : ''}${fmt(position.gapValue)}`, cls: position.gapValue >= 0 ? 'text-success' : 'text-destructive' },
        ].map(m => (
          <div key={m.label}>
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
            <p className={cn('tabular-nums font-mono text-xs font-semibold text-card-foreground', m.cls)}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Fundamentals */}
      {position.fundamentals && (
        <div className="mt-3">
          <MetricBadges
            peRatio={position.fundamentals.peRatio}
            pegRatio={position.fundamentals.pegRatio}
            eps={position.fundamentals.eps}
            dividendYield={position.fundamentals.dividendYield}
          />
        </div>
      )}

      {/* Investment input */}
      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Invest this month
        </p>
        {isEditable ? (
          <>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {sym}
              </span>
              <input
                type="number"
                min="0"
                step="10"
                value={amount}
                onChange={e => onAmountChange(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 pl-6 pr-3 font-mono text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            {position.suggestedAmount > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Suggested {fmt(position.suggestedAmount)}
                {position.suggestedShares > 0 && (
                  <span className="ml-1 font-semibold">
                    ({position.suggestedShares} {position.suggestedShares === 1 ? 'share' : 'shares'})
                  </span>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="tabular-nums font-mono text-sm text-muted-foreground">
            {fmt(0)} — {STATUS_LABELS[position.status]}
          </p>
        )}
      </div>

      {/* AI summary */}
      {(isLoadingSummary || position.aiSummary) && (
        <div className="mt-3 border-t border-border pt-3">
          {isLoadingSummary && !position.aiSummary ? (
            <div className="space-y-1.5">
              <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">AI</span>
                {position.aiSentiment && (
                  <span
                    className={cn(
                      'rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                      position.aiSentiment === 'POSITIVE' && 'bg-success/15 text-success border-success/30',
                      position.aiSentiment === 'CAUTIOUS' && 'bg-warning/15 text-warning border-warning/30',
                      position.aiSentiment === 'NEUTRAL' && 'bg-muted text-muted-foreground border-border',
                    )}
                  >
                    {position.aiSentiment.charAt(0) + position.aiSentiment.slice(1).toLowerCase()}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-purple-400">{position.aiSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
