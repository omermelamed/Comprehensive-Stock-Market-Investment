import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import type { RecommendationCard as RecommendationCardType, FundamentalsData } from '@/types'

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

function formatMarketCap(raw: string | null): string {
  if (!raw) return '—'
  const n = Number(raw)
  if (isNaN(n)) return raw
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toLocaleString()}`
}

function FundamentalsPanel({ data }: { data: FundamentalsData }) {
  const rows: [string, string][] = [
    ['P/E', data.peRatio?.toFixed(1) ?? '—'],
    ['PEG', data.pegRatio?.toFixed(2) ?? '—'],
    ['EPS', data.eps != null ? `$${data.eps.toFixed(2)}` : '—'],
    ['Div yield', data.dividendYield != null ? `${(data.dividendYield * 100).toFixed(2)}%` : '—'],
    ['52W high', data.fiftyTwoWeekHigh != null ? `$${data.fiftyTwoWeekHigh.toFixed(2)}` : '—'],
    ['52W low',  data.fiftyTwoWeekLow  != null ? `$${data.fiftyTwoWeekLow.toFixed(2)}`  : '—'],
    ['Mkt cap',  formatMarketCap(data.marketCap)],
  ].filter(([, v]) => v !== '—') as [string, string][]

  if (rows.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-mono text-xs font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const CONFIDENCE_BAR: Record<RecommendationCardType['confidence'], { pct: number; color: string }> = {
  HIGH:   { pct: 85, color: 'bg-success' },
  MEDIUM: { pct: 55, color: 'bg-warning' },
  LOW:    { pct: 25, color: 'bg-muted-foreground' },
}

function ConfidenceBar({ level }: { level: RecommendationCardType['confidence'] }) {
  const { pct, color } = CONFIDENCE_BAR[level]
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-[10px] font-medium', CONFIDENCE_STYLES[level])}>
        {CONFIDENCE_LABELS[level]}
      </span>
    </div>
  )
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
            {card.sourceUrl ? (
              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-lg font-bold text-card-foreground hover:text-primary"
              >
                {card.symbol}
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            ) : (
              <p className="font-mono text-lg font-bold text-card-foreground">{card.symbol}</p>
            )}
            {card.currentPrice !== null && (
              <span className="tabular-nums font-mono text-xs text-muted-foreground">
                {formatMoney(card.currentPrice, currency)}
                {card.targetPrice != null && (
                  <span className="ml-2">
                    → target {formatMoney(card.targetPrice, currency)}
                  </span>
                )}
                {card.expectedReturnPercent != null && (
                  <span className="ml-1 text-success">
                    ({card.expectedReturnPercent >= 0 ? '+' : ''}
                    {card.expectedReturnPercent.toFixed(1)}%)
                  </span>
                )}
              </span>
            )}
          </div>
          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', ACTION_STYLES[card.action])}>
            {card.action.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Source + confidence bar + time horizon */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs font-medium',
            SOURCE_STYLES[card.source],
          )}
        >
          {SOURCE_LABELS[card.source]}
        </span>
        <ConfidenceBar level={card.confidence} />
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

      {/* Fundamentals */}
      {card.fundamentals && <FundamentalsPanel data={card.fundamentals} />}

      {/* Suggested amount */}
      {card.suggestedAmount !== null && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Suggested</span>
          <span className="tabular-nums font-mono text-sm font-semibold text-foreground">
            {formatMoney(card.suggestedAmount, currency)}
          </span>
        </div>
      )}
    </div>
  )
}
