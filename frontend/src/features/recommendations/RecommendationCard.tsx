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

const ACTION_STYLES: Record<RecommendationCardType['action'], string> = {
  BUY:          'border-success/30 bg-success/15 text-success',
  SHORT:        'border-destructive/30 bg-destructive/15 text-destructive',
  COVERED_CALL: 'border-warning/30 bg-warning/15 text-warning',
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
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {card.rank}
        </span>
        <div className="flex flex-1 items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-lg font-bold text-card-foreground">{card.symbol}</p>
            {card.currentPrice !== null && (
              <span className="font-mono text-xs text-muted-foreground">
                {formatMoney(card.currentPrice, currency)}
              </span>
            )}
          </div>
          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', ACTION_STYLES[card.action])}>
            {card.action.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Source + confidence + time horizon */}
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
        {card.timeHorizon && (
          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
            {card.timeHorizon}
          </span>
        )}
      </div>

      {/* AI reason */}
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
        <p className="mb-1 text-xs font-medium text-purple-500">AI</p>
        <p className="text-xs leading-relaxed text-purple-400">{card.reason}</p>
      </div>

      {/* Catalysts */}
      {card.catalysts && card.catalysts.length > 0 && (
        <ul className="space-y-1">
          {card.catalysts.map((catalyst, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              {catalyst}
            </li>
          ))}
        </ul>
      )}

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
