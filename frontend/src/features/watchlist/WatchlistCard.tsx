import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BrainCircuit, ExternalLink, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WatchlistItem, WatchlistMetrics } from '@/types'
import { getWatchlistMetrics } from '@/api/watchlist'

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
  isOverweight?: boolean
  onAskAi?: (symbol: string) => void
  onSetAlert?: (symbol: string) => void
}

export function WatchlistCard({ item, onAnalyze, onRemove, isAnalyzing, isOverweight, onAskAi, onSetAlert }: Props) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [metrics, setMetrics] = useState<WatchlistMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!showAnalysis || metrics) return
    setMetricsLoading(true)
    getWatchlistMetrics(item.id)
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setMetricsLoading(false))
  }, [showAnalysis, metrics, item.id])

  const confidenceScore = item.confidenceScore ?? item.fullAnalysis?.confidenceScore
  const sources = item.fullAnalysis?.sources

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
        <div className="flex items-center gap-2">
          {confidenceScore != null && (
            <span className="text-[10px] font-mono text-muted-foreground">{confidenceScore}%</span>
          )}
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs font-medium',
              SIGNAL_STYLES[item.signal]
            )}
          >
            {SIGNAL_LABELS[item.signal]}
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      {confidenceScore != null && (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Confidence</span>
            <span className="font-mono">{confidenceScore}/100</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                confidenceScore >= 70 ? 'bg-success' : confidenceScore >= 40 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${confidenceScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Overweight warning */}
      {isOverweight && (
        <div className="flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
          <span className="text-xs font-medium text-warning">Already overweight in your portfolio</span>
        </div>
      )}

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
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAnalyze(item.id)}
            disabled={isAnalyzing}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
          {onSetAlert && (
            <button
              onClick={() => onSetAlert(item.symbol)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Set Alert
            </button>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            Remove
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/transactions/new?symbol=${item.symbol}`)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <PlusCircle className="h-3 w-3" />
            Add to Portfolio
          </button>
          {onAskAi && (
            <button
              onClick={() => onAskAi(item.symbol)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-1.5 text-xs font-medium text-purple-500 transition-colors hover:bg-purple-500/10"
            >
              <BrainCircuit className="h-3 w-3" />
              Ask AI
            </button>
          )}
        </div>
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
              {/* Metrics cell — lazy loaded */}
              {metricsLoading && (
                <div className="h-12 animate-pulse rounded-lg bg-muted" />
              )}
              {metrics && (
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-xs">
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-mono font-semibold text-foreground">
                      {metrics.currentPrice != null ? `${metrics.currentPrice.toFixed(2)} ${metrics.currency}` : 'N/A'}
                    </p>
                  </div>
                  {metrics.fundamentals?.peRatio != null && (
                    <div>
                      <p className="text-muted-foreground">P/E</p>
                      <p className="font-mono font-semibold text-foreground">{metrics.fundamentals.peRatio.toFixed(1)}</p>
                    </div>
                  )}
                  {metrics.fundamentals?.dividendYield != null && (
                    <div>
                      <p className="text-muted-foreground">Div Yield</p>
                      <p className="font-mono font-semibold text-foreground">{(metrics.fundamentals.dividendYield * 100).toFixed(2)}%</p>
                    </div>
                  )}
                  {metrics.fundamentals?.marketCap && (
                    <div>
                      <p className="text-muted-foreground">Market Cap</p>
                      <p className="font-mono font-semibold text-foreground">{metrics.fundamentals.marketCap}</p>
                    </div>
                  )}
                </div>
              )}

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

              {/* Sources */}
              {sources && sources.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        {new URL(url).hostname.replace('www.', '')}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
