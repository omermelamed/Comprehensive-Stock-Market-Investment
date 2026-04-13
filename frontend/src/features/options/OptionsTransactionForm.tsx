import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CreateOptionsPositionRequest } from '@/api/options'

interface OptionsTransactionFormProps {
  onSubmit: (data: CreateOptionsPositionRequest) => Promise<void>
  isSubmitting?: boolean
}

export function OptionsTransactionForm({ onSubmit, isSubmitting = false }: OptionsTransactionFormProps) {
  const [underlyingSymbol, setUnderlyingSymbol] = useState('')
  const [optionType, setOptionType] = useState<'CALL' | 'PUT'>('CALL')
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY')
  const [strikePrice, setStrikePrice] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [contracts, setContracts] = useState('')
  const [premiumPerContract, setPremiumPerContract] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const totalPremium = (() => {
    const c = parseFloat(contracts)
    const p = parseFloat(premiumPerContract)
    if (!isNaN(c) && !isNaN(p) && c > 0 && p > 0) {
      return c * p * 100
    }
    return null
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const c = parseFloat(contracts)
    const p = parseFloat(premiumPerContract)
    const s = parseFloat(strikePrice)

    if (!underlyingSymbol.trim()) return setError('Underlying symbol is required.')
    if (isNaN(s) || s <= 0) return setError('Strike price must be a positive number.')
    if (!expirationDate) return setError('Expiration date is required.')
    if (isNaN(c) || c < 1 || !Number.isInteger(c)) return setError('Contracts must be a positive whole number.')
    if (isNaN(p) || p <= 0) return setError('Premium per contract must be a positive number.')

    try {
      await onSubmit({
        underlyingSymbol: underlyingSymbol.trim().toUpperCase(),
        optionType,
        action,
        strikePrice: s,
        expirationDate,
        contracts: c,
        premiumPerContract: p,
        notes: notes.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create position')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Symbol */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Underlying Symbol</label>
        <input
          type="text"
          value={underlyingSymbol}
          onChange={e => setUnderlyingSymbol(e.target.value.toUpperCase())}
          placeholder="e.g. AAPL"
          className={cn(
            'w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
          )}
          required
        />
      </div>

      {/* Option type + action toggles */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Option Type</label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['CALL', 'PUT'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setOptionType(t)}
                className={cn(
                  'flex-1 py-2 text-sm font-medium transition-colors',
                  optionType === t
                    ? t === 'CALL'
                      ? 'bg-blue-600 text-white'
                      : 'bg-orange-600 text-white'
                    : 'bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Action</label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['BUY', 'SELL'] as const).map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setAction(a)}
                className={cn(
                  'flex-1 py-2 text-sm font-medium transition-colors',
                  action === a
                    ? a === 'BUY'
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Strike + expiration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Strike Price ($)</label>
          <input
            type="number"
            value={strikePrice}
            onChange={e => setStrikePrice(e.target.value)}
            placeholder="150.00"
            min="0.01"
            step="0.01"
            className={cn(
              'w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
            )}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Expiration Date</label>
          <input
            type="date"
            value={expirationDate}
            onChange={e => setExpirationDate(e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring',
            )}
            required
          />
        </div>
      </div>

      {/* Contracts + premium */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Contracts</label>
          <input
            type="number"
            value={contracts}
            onChange={e => setContracts(e.target.value)}
            placeholder="1"
            min="1"
            step="1"
            className={cn(
              'w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
            )}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Premium per Contract ($)</label>
          <input
            type="number"
            value={premiumPerContract}
            onChange={e => setPremiumPerContract(e.target.value)}
            placeholder="2.50"
            min="0.01"
            step="0.01"
            className={cn(
              'w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
            )}
            required
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Strategy rationale, hedging notes..."
          rows={3}
          className={cn(
            'w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
          )}
        />
      </div>

      {/* Calculated total */}
      {totalPremium !== null && (
        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Premium</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {totalPremium.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {contracts} contract{parseFloat(contracts) !== 1 ? 's' : ''} × ${premiumPerContract} × 100 shares
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground',
          'transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {isSubmitting ? 'Creating...' : 'Create Position'}
      </button>
    </form>
  )
}
