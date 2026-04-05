import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import type { RecommendationCard as RecommendationCardType } from '@/types'

const SOURCE_STYLES: Record<RecommendationCardType['source'], string> = {
  ALLOCATION_GAP: 'bg-primary/15 text-primary border-primary/30',
  WATCHLIST:      'bg-warning/15 text-warning border-warning/30',
  AI_SUGGESTION:  'bg-muted text-muted-foreground border-border',
}

const SOURCE_LABELS: Record<RecommendationCardType['source'], string> = {
  ALLOCATION_GAP: 'Allocation gap',
  WATCHLIST:      'Watchlist signal',
  AI_SUGGESTION:  'AI suggestion',
}

const CONFIDENCE_STYLES: Record<RecommendationCardType['confidence'], string> = {
  HIGH:   'text-success',
  MEDIUM: 'text-warning',
  LOW:    'text-muted-foreground',
}

const CONFIDENCE_LABELS: Record<RecommendationCardType['confidence'], string> = {
  HIGH:   'High confidence',
  MEDIUM: 'Medium confidence',
  LOW:    'Low confidence',
}

interface Props {
  card: RecommendationCardType
  currency: string
}

export function RecommendationCard({ card, currency }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header row: rank + symbol + action badge */}
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {card.rank}
        </span>

        {/* Symbol and action */}
        <div className="flex flex-1 items-center justify-between gap-2">
          <p className="font-mono text-lg font-bold text-card-foreground">{card.symbol}</p>
          <span className="rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
            {card.action}
          </span>
        </div>
      </div>

      {/* Source + confidence badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs font-medium',
            SOURCE_STYLES[card.source],
          )}
        >
          {SOURCE_LABELS[card.source]}
        </span>
        <span className={cn('text-xs font-medium', CONFIDENCE_STYLES[card.confidence])}>
          {CONFIDENCE_LABELS[card.confidence]}
        </span>
      </div>

      {/* AI reason */}
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
        <p className="mb-1 text-xs font-medium text-purple-500">AI</p>
        <p className="text-xs leading-relaxed text-purple-400">{card.reason}</p>
      </div>

      {/* Suggested amount */}
      {card.suggestedAmount !== null && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Suggested</span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatMoney(card.suggestedAmount, currency)}
          </span>
        </div>
      )}
    </div>
  )
}
