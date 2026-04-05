import { cn } from '@/lib/utils'

function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

interface Props {
  budget: number
  totalAllocated: number
  remaining: number
  onConfirm: () => void
  isConfirming: boolean
}

export function AllocationSummaryFooter({
  budget,
  totalAllocated,
  remaining,
  onConfirm,
  isConfirming,
}: Props) {
  const isOverBudget = remaining < 0
  const canConfirm = !isOverBudget && totalAllocated > 0 && !isConfirming

  return (
    <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-5xl flex items-center justify-between gap-6 px-6 py-4">
        {/* Totals */}
        <div className="flex items-center gap-8">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="font-mono text-sm font-semibold text-card-foreground">{fmt(budget)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Allocated</p>
            <p className="font-mono text-sm font-semibold text-card-foreground">{fmt(totalAllocated)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className={cn('font-mono text-sm font-semibold', isOverBudget ? 'text-destructive' : 'text-success')}>
              {fmt(remaining)}
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isConfirming ? 'Confirming…' : 'Confirm Investment'}
        </button>
      </div>
    </div>
  )
}
