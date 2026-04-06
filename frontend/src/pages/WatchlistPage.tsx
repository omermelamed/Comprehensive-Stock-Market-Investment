import { useEffect, useState } from 'react'
import { Bell, Star, Trash2 } from 'lucide-react'
import { ASSET_TYPES } from '@/data/onboarding'
import { WatchlistCard } from '@/features/watchlist/WatchlistCard'
import {
  getWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  analyzeWatchlistItem,
} from '@/api/watchlist'
import { getAlerts, createAlert, deleteAlert } from '@/api/alerts'
import { getPortfolioHoldings, type HoldingDashboard } from '@/api/portfolio'
import { useChatActions } from '@/contexts/chat-context'
import type { WatchlistItem, Alert } from '@/types'

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [overweightSymbols, setOverweightSymbols] = useState<Set<string>>(new Set())
  const { openWithPrompt } = useChatActions()

  // Add form state
  const [symbol, setSymbol] = useState('')
  const [assetType, setAssetType] = useState<string>(ASSET_TYPES[0].value)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Per-item analyzing state
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertForm, setAlertForm] = useState<{ symbol: string; condition: string; price: string; note: string } | null>(null)
  const [alertError, setAlertError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getWatchlist(),
      getPortfolioHoldings().catch(() => [] as HoldingDashboard[]),
      getAlerts().catch(() => [] as Alert[]),
    ])
      .then(([watchlistData, holdings, alertsData]) => {
        setItems(watchlistData)
        setAlerts(alertsData)
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

  async function handleAnalyze(id: string) {
    setAnalyzingIds(prev => new Set(prev).add(id))
    try {
      const updated = await analyzeWatchlistItem(id)
      setItems(prev => prev.map(item => (item.id === id ? updated : item)))
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
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
    setAlertForm({ symbol: sym, condition: 'BELOW', price: '', note: '' })
    setAlertError(null)
  }

  async function handleAlertSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!alertForm) return
    const price = parseFloat(alertForm.price)
    if (isNaN(price) || price <= 0) {
      setAlertError('Enter a valid price.')
      return
    }
    try {
      const newAlert = await createAlert(
        alertForm.symbol.toUpperCase(),
        alertForm.condition,
        price,
        alertForm.note || undefined
      )
      setAlerts(prev => [newAlert, ...prev])
      setAlertForm(null)
      setAlertError(null)
    } catch {
      setAlertError('Failed to create alert.')
    }
  }

  async function handleDeleteAlert(id: string) {
    try {
      await deleteAlert(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
    } catch {
      // silently ignore
    }
  }

  const activeAlerts = alerts.filter(a => a.isActive)
  const triggeredAlerts = alerts.filter(a => !a.isActive && a.triggeredAt)

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Watchlist</h1>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Track symbols and run AI analysis to help inform investment decisions.
        </p>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
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

          {/* Alert form (inline, shown when "Set Alert" clicked) */}
          {alertForm && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Set alert for <span className="font-mono">{alertForm.symbol}</span>
              </p>
              <form onSubmit={handleAlertSubmit} className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Condition</label>
                  <select
                    value={alertForm.condition}
                    onChange={e => setAlertForm(f => f && { ...f, condition: e.target.value })}
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="BELOW">Price drops below</option>
                    <option value="ABOVE">Price rises above</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={alertForm.price}
                    onChange={e => setAlertForm(f => f && { ...f, price: e.target.value })}
                    placeholder="100.00"
                    className="w-28 rounded-lg border border-input bg-background px-3 py-1.5 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Note (optional)</label>
                  <input
                    type="text"
                    value={alertForm.note}
                    onChange={e => setAlertForm(f => f && { ...f, note: e.target.value })}
                    placeholder="e.g. Good entry point"
                    className="w-48 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setAlertForm(null)}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </form>
              {alertError && <p className="mt-2 text-xs text-destructive">{alertError}</p>}
            </div>
          )}

          {/* Active alerts */}
          {activeAlerts.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Active Alerts</p>
              </div>
              <div className="space-y-2">
                {activeAlerts.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="text-xs">
                      <span className="font-mono font-semibold text-foreground">{a.symbol}</span>
                      <span className="text-muted-foreground mx-1.5">
                        {a.condition === 'ABOVE' ? 'rises above' : 'drops below'}
                      </span>
                      <span className="font-mono text-foreground">${a.thresholdPrice.toFixed(2)}</span>
                      {a.note && <span className="ml-2 text-muted-foreground">— {a.note}</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(a.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-success">Triggered Alerts</p>
              <div className="space-y-2">
                {triggeredAlerts.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-success/20 bg-success/5 px-3 py-2">
                    <div className="text-xs">
                      <span className="font-mono font-semibold text-foreground">{a.symbol}</span>
                      <span className="text-muted-foreground mx-1.5">
                        {a.condition === 'ABOVE' ? 'rose above' : 'dropped below'}
                      </span>
                      <span className="font-mono text-foreground">${a.thresholdPrice.toFixed(2)}</span>
                      {a.note && <span className="ml-2 text-muted-foreground">— {a.note}</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(a.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  onAnalyze={handleAnalyze}
                  onRemove={handleRemove}
                  isAnalyzing={analyzingIds.has(item.id)}
                  isOverweight={overweightSymbols.has(item.symbol.toUpperCase())}
                  onAskAi={(sym) => openWithPrompt(`What do you think about ${sym}? Should I add it to my portfolio?`)}
                  onSetAlert={handleSetAlert}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && items.length === 0 && !loadError && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <Star className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No items in your watchlist</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a symbol above to start tracking and analyzing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
