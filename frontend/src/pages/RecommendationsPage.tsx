import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { getRecommendations, refreshRecommendations } from '@/api/recommendations'
import { RecommendationCard } from '@/features/recommendations/RecommendationCard'
import { useCurrency } from '@/contexts/currency-context'
import { formatMoney } from '@/lib/currency'
import { ASSET_TRACKS } from '@/data/onboarding'

function translateTrack(value: string): string {
  return ASSET_TRACKS.find(t => t.value === value)?.label ?? value
}
import type { RecommendationsResponse } from '@/types'

function formatMinutesAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff === 1) return '1 minute ago'
  return `${diff} minutes ago`
}

function formatMinutesUntil(iso: string): string {
  const diff = Math.floor((new Date(iso).getTime() - Date.now()) / 60000)
  if (diff <= 0) return 'expired'
  if (diff === 1) return '1 minute'
  return `${diff} minutes`
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-5 w-5 rounded-full bg-muted" />
        <div className="flex flex-1 items-center justify-between gap-2">
          <div className="h-6 w-16 rounded bg-muted" />
          <div className="h-5 w-10 rounded-full bg-muted" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-28 rounded-full bg-muted" />
        <div className="h-5 w-24 rounded bg-muted" />
      </div>
      <div className="rounded-lg bg-muted h-16" />
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    </div>
  )
}

export default function RecommendationsPage() {
  const currency = useCurrency()
  const [data, setData] = useState<RecommendationsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    getRecommendations()
      .then(setData)
      .catch(() => setError('Failed to load recommendations. Check that the backend is running.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleRefresh() {
    setIsRefreshing(true)
    setError(null)
    refreshRecommendations()
      .then(setData)
      .catch(() => setError('Failed to refresh recommendations.'))
      .finally(() => setIsRefreshing(false))
  }

  const ctx = data?.portfolioContext

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Recommendations</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              AI-powered investment recommendations based on your portfolio gaps and watchlist signals.
            </p>
            {data && (
              <p className="mt-1 text-xs text-muted-foreground">
                Generated {formatMinutesAgo(data.generatedAt)} · expires in{' '}
                {formatMinutesUntil(data.expiresAt)}
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
          </button>
        </div>
      </div>

      {/* Portfolio context strip */}
      {ctx && (
        <div className="border-b border-border bg-card/50 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Portfolio</span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {formatMoney(ctx.totalValue, ctx.currency)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Monthly budget</span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {formatMoney(ctx.monthlyBudget, ctx.currency)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Risk</span>
              <span className="text-xs font-semibold text-foreground">{ctx.riskLevel}</span>
            </div>
            {ctx.tracksEnabled.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5">
                <span className="text-xs text-muted-foreground">Tracks</span>
                <span className="text-xs font-semibold text-foreground">
                  {ctx.tracksEnabled.map(translateTrack).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl">
          {/* Error state */}
          {error && (
            <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Skeleton loading */}
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Generation error banner (distinct from network/load error) */}
          {!isLoading && data?.generationError && (
            <div className="mb-6 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              {data.generationError === 'claude_failure'
                ? 'Could not reach the AI service. Check that your Claude API key is configured and try refreshing.'
                : 'The AI service returned an unexpected response. Try refreshing.'}
            </div>
          )}

          {/* Recommendation cards */}
          {!isLoading && data && data.recommendations.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.recommendations.map(card => (
                <RecommendationCard key={card.rank} card={card} currency={currency} />
              ))}
            </div>
          )}

          {/* Empty state — no generation error and no cards */}
          {!isLoading && data && data.recommendations.length === 0 && !data.generationError && (
            <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No recommendations generated. Make sure you have target allocations set up.
              </p>
            </div>
          )}

          {/* Error-only state (no data yet) */}
          {!isLoading && !data && !error && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No recommendation data available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
