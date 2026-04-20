import { useState } from 'react'
import { updateTransaction } from '../../api/transactions'
import type { Transaction } from '../../types'
import { ASSET_TRACKS } from '../../data/onboarding'

const TRANSACTION_TYPES = ['BUY', 'SELL', 'SHORT', 'COVER', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL'] as const

const labelClass = 'block text-sm font-medium text-muted-foreground mb-1.5'
const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

interface Props {
  transaction: Transaction
  onClose: () => void
  onSaved: () => void
}

function toDateInput(isoString: string): string {
  return isoString.slice(0, 10)
}

export default function EditTransactionModal({ transaction, onClose, onSaved }: Props) {
  const [symbol, setSymbol] = useState(transaction.symbol)
  const [type, setType] = useState<typeof TRANSACTION_TYPES[number]>(transaction.type as typeof TRANSACTION_TYPES[number])
  const [track, setTrack] = useState(transaction.track)
  const [quantity, setQuantity] = useState(transaction.quantity)
  const [pricePerUnit, setPricePerUnit] = useState(transaction.pricePerUnit)
  const [executedAt, setExecutedAt] = useState(toDateInput(transaction.executedAt))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await updateTransaction(Number(transaction.id), {
        symbol: symbol.trim().toUpperCase(),
        type,
        track,
        quantity,
        pricePerUnit,
        executedAt: `${executedAt}T12:00:00Z`,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={e => void handleSubmit(e)} className="p-6 space-y-4">
          {/* Symbol */}
          <div>
            <label className={labelClass}>Symbol *</label>
            <input
              type="text"
              className={inputClass}
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              required
            />
          </div>

          {/* Type + Track */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Transaction Type</label>
              <select
                className={inputClass}
                value={type}
                onChange={e => setType(e.target.value as typeof TRANSACTION_TYPES[number])}
              >
                {TRANSACTION_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Track</label>
              <select
                className={inputClass}
                value={track}
                onChange={e => setTrack(e.target.value)}
              >
                {ASSET_TRACKS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                className={inputClass}
                min={0}
                step={0.0001}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Price Per Unit</label>
              <input
                type="number"
                className={inputClass}
                min={0}
                step={0.01}
                value={pricePerUnit}
                onChange={e => setPricePerUnit(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              className={inputClass}
              value={executedAt}
              onChange={e => setExecutedAt(e.target.value)}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || symbol.trim() === ''}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
