import { useEffect, useRef, useState } from 'react'
import type { CreateAlertData } from './useAlerts'

interface CreateAlertFormProps {
  defaultSymbol?: string
  onSubmit: (data: CreateAlertData) => Promise<void>
}

export function CreateAlertForm({ defaultSymbol, onSubmit }: CreateAlertFormProps) {
  const [symbol, setSymbol] = useState(defaultSymbol ?? '')
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('BELOW')
  const [thresholdPrice, setThresholdPrice] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const priceRef = useRef<HTMLInputElement>(null)

  // When defaultSymbol is provided, pre-fill and focus price
  useEffect(() => {
    if (defaultSymbol) {
      setSymbol(defaultSymbol)
      priceRef.current?.focus()
    }
  }, [defaultSymbol])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedSymbol = symbol.trim().toUpperCase()
    if (!trimmedSymbol) {
      setError('Symbol is required.')
      return
    }
    const price = parseFloat(thresholdPrice)
    if (isNaN(price) || price <= 0) {
      setError('Enter a valid threshold price.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({
        symbol: trimmedSymbol,
        condition,
        thresholdPrice: price,
        note: note.trim() || undefined,
      })
      // Clear form on success
      setSymbol(defaultSymbol ?? '')
      setCondition('BELOW')
      setThresholdPrice('')
      setNote('')
    } catch {
      setError('Failed to create alert. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {/* Symbol */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Symbol</label>
        <input
          type="text"
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          onBlur={e => setSymbol(e.target.value.trim().toUpperCase())}
          placeholder="e.g. VOO"
          className="w-28 rounded-lg border border-input bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Condition toggle */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Condition</label>
        <div className="flex rounded-lg border border-input overflow-hidden">
          <button
            type="button"
            onClick={() => setCondition('ABOVE')}
            className={[
              'px-3 py-1.5 text-sm font-medium transition-colors',
              condition === 'ABOVE'
                ? 'bg-emerald-500 text-white'
                : 'bg-background text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            ABOVE
          </button>
          <button
            type="button"
            onClick={() => setCondition('BELOW')}
            className={[
              'px-3 py-1.5 text-sm font-medium transition-colors',
              condition === 'BELOW'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            BELOW
          </button>
        </div>
      </div>

      {/* Threshold price */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Threshold price</label>
        <input
          ref={priceRef}
          type="number"
          step="0.01"
          min="0"
          value={thresholdPrice}
          onChange={e => setThresholdPrice(e.target.value)}
          placeholder="100.00"
          className="w-32 rounded-lg border border-input bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Note (optional) */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Good entry point"
          className="w-48 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Setting...' : 'Set Alert'}
      </button>

      {error && (
        <p className="w-full text-xs text-destructive">{error}</p>
      )}
    </form>
  )
}
