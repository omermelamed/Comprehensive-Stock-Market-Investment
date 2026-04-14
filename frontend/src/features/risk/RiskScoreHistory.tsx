import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskHistoryEntry } from '@/api/riskProfile'

interface RiskScoreHistoryProps {
  history: RiskHistoryEntry[]
}

const RISK_LEVEL_STYLES: Record<RiskHistoryEntry['riskLevel'], string> = {
  CONSERVATIVE: 'bg-green-500/15 text-green-400',
  MODERATE: 'bg-yellow-500/15 text-yellow-400',
  AGGRESSIVE: 'bg-red-500/15 text-red-400',
}

const RISK_BAR_COLORS: Record<RiskHistoryEntry['riskLevel'], string> = {
  CONSERVATIVE: 'bg-green-500',
  MODERATE: 'bg-yellow-500',
  AGGRESSIVE: 'bg-red-500',
}

const TRIGGER_LABELS: Record<RiskHistoryEntry['trigger'], string> = {
  MANUAL: 'Manual',
  AUTO: 'Auto',
  ONBOARDING: 'Onboarding',
}

const TRIGGER_STYLES: Record<RiskHistoryEntry['trigger'], string> = {
  MANUAL: 'bg-muted text-muted-foreground',
  AUTO: 'bg-primary/10 text-primary',
  ONBOARDING: 'bg-purple-500/15 text-purple-400',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const PAGE_SIZE = 10

export function RiskScoreHistory({ history }: RiskScoreHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  if (history.length === 0) {
    return null
  }

  const visible = showAll ? history : history.slice(0, PAGE_SIZE)
  const hasMore = history.length > PAGE_SIZE

  function toggleRow(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Score History</h2>

      <div className="space-y-0 overflow-hidden rounded-lg border border-border">
        {visible.map((entry, idx) => (
          <div key={entry.id} className={cn(idx < visible.length - 1 && 'border-b border-border')}>
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              onClick={() => toggleRow(entry.id)}
            >
              {/* Date */}
              <span className="w-28 shrink-0 text-xs text-muted-foreground">
                {formatDate(entry.createdAt)}
              </span>

              {/* Risk level badge */}
              <span
                className={cn(
                  'inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  RISK_LEVEL_STYLES[entry.riskLevel],
                )}
              >
                {entry.riskLevel}
              </span>

              {/* Score bar */}
              {entry.aiInferredScore !== null ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', RISK_BAR_COLORS[entry.riskLevel])}
                      style={{ width: `${entry.aiInferredScore * 100}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {entry.aiInferredScore.toFixed(3)}
                  </span>
                </div>
              ) : (
                <span className="flex-1 text-xs text-muted-foreground">—</span>
              )}

              {/* Trigger badge */}
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  TRIGGER_STYLES[entry.trigger],
                )}
              >
                {TRIGGER_LABELS[entry.trigger]}
              </span>

              {/* Expand indicator */}
              {expandedId === entry.id ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </button>

            {expandedId === entry.id && entry.reasoning && (
              <div className="border-t border-border bg-muted/30 px-4 py-3">
                <p className="text-xs leading-relaxed text-muted-foreground">{entry.reasoning}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {showAll ? 'Show less' : `Show all ${history.length} entries`}
        </button>
      )}
    </div>
  )
}
