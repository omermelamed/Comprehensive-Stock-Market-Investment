import { cn } from '@/lib/utils'
import type { PositionCard } from '@/types'

function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

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
}

export function PositionAllocationCard({ position, amount, onAmountChange }: Props) {
  const isEditable = position.status === 'UNDERWEIGHT'

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-base font-bold text-card-foreground">{position.symbol}</p>
          {position.label && (
            <p className="text-xs text-muted-foreground">{position.label}</p>
          )}
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs font-medium',
            STATUS_STYLES[position.status]
          )}
        >
          {STATUS_LABELS[position.status]}
        </span>
      </div>

      {/* Allocation bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Current {fmtPct(position.currentPercent)}</span>
          <span>Target {fmtPct(position.targetPercent)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              position.status === 'OVERWEIGHT' ? 'bg-destructive' : 'bg-primary'
            )}
            style={{ width: `${Math.min(100, (position.currentPercent / Math.max(position.targetPercent, 0.01)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Current value</p>
          <p className="font-mono font-semibold text-card-foreground">{fmt(position.currentValue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Gap</p>
          <p className={cn('font-mono font-semibold', position.gapValue >= 0 ? 'text-success' : 'text-destructive')}>
            {position.gapValue >= 0 ? '+' : ''}{fmt(position.gapValue)}
          </p>
        </div>
      </div>

      {/* Amount input */}
      <div className="border-t border-border pt-3">
        <p className="mb-1.5 text-xs text-muted-foreground">Invest this month</p>
        {isEditable ? (
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <input
              type="number"
              min="0"
              step="10"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-1.5 pl-6 pr-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ) : (
          <p className="font-mono text-sm font-semibold text-muted-foreground">$0.00 — {STATUS_LABELS[position.status]}</p>
        )}
        {isEditable && position.suggestedAmount > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Suggested {fmt(position.suggestedAmount)}
          </p>
        )}
      </div>
    </div>
  )
}
