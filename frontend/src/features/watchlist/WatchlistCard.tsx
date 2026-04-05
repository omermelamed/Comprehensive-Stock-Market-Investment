import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { WatchlistItem } from '@/types'

const SIGNAL_STYLES: Record<WatchlistItem['signal'], string> = {
  GOOD_BUY_NOW: 'bg-success/15 text-success border-success/30',
  WAIT_FOR_DIP: 'bg-warning/15 text-warning border-warning/30',
  NOT_YET:      'bg-destructive/15 text-destructive border-destructive/30',
  PENDING:      'bg-muted text-muted-foreground border-border',
}

const SIGNAL_LABELS: Record<WatchlistItem['signal'], string> = {
  GOOD_BUY_NOW: 'Buy now',
  WAIT_FOR_DIP: 'Wait for dip',
  NOT_YET:      'Not yet',
  PENDING:      'Not analyzed',
}

const SECTION_TITLES: Record<string, string> = {
  valuation:      'Valuation',
  momentum:       'Momentum',
  financialHealth: 'Financial Health',
  growth:         'Growth',
  sentiment:      'Sentiment',
}

function formatAnalyzedAt(iso: string | null): string {
  if (!iso) return 'Never analyzed'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Analyzed today'
  if (days === 1) return 'Analyzed 1 day ago'
  return `Analyzed ${days} days ago`
}

interface Props {
  item: WatchlistItem
  onAnalyze: (id: string) => void
  onRemove: (id: string) => void
  isAnalyzing: boolean
}

export function WatchlistCard({ item, onAnalyze, onRemove, isAnalyzing }: Props) {
  const [showAnalysis, setShowAnalysis] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-base font-bold text-card-foreground">{item.symbol}</p>
          {item.companyName && (
            <p className="text-xs text-muted-foreground">{item.companyName}</p>
          )}
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs font-medium',
            SIGNAL_STYLES[item.signal]
          )}
        >
          {SIGNAL_LABELS[item.signal]}
        </span>
      </div>

      {/* Asset type + analyzed timestamp */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-medium">
          {item.assetType}
        </span>
        <span>{formatAnalyzedAt(item.lastAnalyzedAt)}</span>
      </div>

      {/* Signal summary */}
      {item.signalSummary && (
        <p className="text-xs text-muted-foreground leading-relaxed">{item.signalSummary}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <button
          onClick={() => onAnalyze(item.id)}
          disabled={isAnalyzing}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className="px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          Remove
        </button>
      </div>

      {/* Full analysis expand/collapse */}
      {item.fullAnalysis && (
        <div className="border-t border-border pt-3 space-y-2">
          <button
            onClick={() => setShowAnalysis(v => !v)}
            className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
          >
            {showAnalysis ? 'Hide analysis' : 'View analysis'}
          </button>

          {showAnalysis && (
            <div className="space-y-3">
              {/* AI header */}
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                <p className="mb-2 text-xs font-medium text-purple-500">AI Analysis</p>
                <p className="text-xs text-purple-400 leading-relaxed">
                  {item.fullAnalysis.summary}
                </p>
              </div>

              {/* Sections grid */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(SECTION_TITLES) as Array<keyof typeof SECTION_TITLES>).map(key => {
                  const text = item.fullAnalysis!.sections[key as keyof typeof item.fullAnalysis.sections]
                  if (!text) return null
                  return (
                    <div key={key} className="rounded-lg border border-border bg-muted/30 p-2.5">
                      <p className="mb-1 text-xs font-bold text-foreground">
                        {SECTION_TITLES[key]}
                      </p>
                      <p className="text-xs text-purple-400 leading-relaxed">{text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
