import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { ASSET_TYPES } from '@/data/onboarding'
import { WatchlistCard } from '@/features/watchlist/WatchlistCard'
import {
  getWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
} from '@/api/watchlist'
import { getPortfolioHoldings, type HoldingDashboard } from '@/api/portfolio'
import type { WatchlistItem } from '@/types'

export default function WatchlistPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [overweightSymbols, setOverweightSymbols] = useState<Set<string>>(new Set())

  // Add form state
  const [symbol, setSymbol] = useState('')
  const [assetType, setAssetType] = useState<string>(ASSET_TYPES[0].value)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getWatchlist(),
      getPortfolioHoldings().catch(() => [] as HoldingDashboard[]),
    ])
      .then(([watchlistData, holdings]) => {
        setItems(watchlistData)
        setLoadError(null)
        const ow = new Set(
          holdings
            .filter(h => h.drift > 0 && h.allocationStatus === 'NEEDS_REBALANCING')
            .map(h => h.symbol.toUpperCase())
        )
        setOverweightSymbols(ow)
      })
      .catch(() => setLoadError('Failed to load watchlist.'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = symbol.trim().toUpperCase()
    if (!trimmed) return
    setIsAdding(true)
    setAddError(null)
    try {
      const newItem = await addWatchlistItem(trimmed, assetType)
      setItems(prev => [newItem, ...prev])
      setSymbol('')
    } catch {
      setAddError('Failed to add item. Check the symbol and try again.')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeWatchlistItem(id)
      setItems(prev => prev.filter(item => item.id !== id))
    } catch {
      // silently ignore
    }
  }

  function handleSetAlert(sym: string) {
    navigate(`/alerts?symbol=${encodeURIComponent(sym.toUpperCase())}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Watchlist</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Add item form */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Add to watchlist</p>
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. VOO"
                  className="w-36 rounded-lg border border-input bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Asset type</label>
                <select
                  value={assetType}
                  onChange={e => setAssetType(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ASSET_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isAdding || !symbol.trim()}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? 'Adding...' : 'Add'}
              </button>
            </form>

            {addError && (
              <p className="mt-2 text-xs text-destructive">{addError}</p>
            )}
          </div>

          {/* Load error */}
          {loadError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {loadError}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          )}

          {/* Items grid */}
          {!isLoading && items.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map(item => (
                <WatchlistCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  isOverweight={overweightSymbols.has(item.symbol.toUpperCase())}
                  onSetAlert={handleSetAlert}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && items.length === 0 && !loadError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Star className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No items in your watchlist</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Add a symbol above to start tracking and analyzing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
