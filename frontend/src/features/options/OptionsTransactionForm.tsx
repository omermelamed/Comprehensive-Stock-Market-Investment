import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOptionsTransaction, type CreateOptionsTransactionRequest } from '../../api/options'

export function OptionsTransactionForm() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CreateOptionsTransactionRequest>({
    underlyingSymbol: '',
    optionType: 'CALL',
    action: 'BUY',
    strikePrice: 0,
    expirationDate: '',
    contracts: 1,
    premiumPerContract: 0,
    notes: '',
  })

  const daysToExpiry = form.expirationDate
    ? Math.ceil((new Date(form.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const earningsRisk = daysToExpiry !== null && daysToExpiry < 14

  function set<K extends keyof CreateOptionsTransactionRequest>(
    key: K,
    value: CreateOptionsTransactionRequest[K]
  ) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await createOptionsTransaction({
        ...form,
        underlyingSymbol: form.underlyingSymbol.trim().toUpperCase(),
        notes: form.notes?.trim() || undefined,
      })
      navigate('/options')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save options transaction'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {earningsRisk && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          Warning: expiration is within 14 days. Earnings or events within this window can dramatically affect option premiums.
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Underlying Symbol */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Underlying Symbol</label>
          <input
            required
            type="text"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. AAPL"
            value={form.underlyingSymbol}
            onChange={e => set('underlyingSymbol', e.target.value)}
          />
        </div>

        {/* Option Type */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Option Type</label>
          <div className="flex gap-2">
            {(['CALL', 'PUT'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set('optionType', t)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  form.optionType === t
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Action</label>
          <div className="flex gap-2">
            {(['BUY', 'SELL'] as const).map(a => (
              <button
                key={a}
                type="button"
                onClick={() => set('action', a)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  form.action === a
                    ? a === 'BUY'
                      ? 'border-success bg-success/20 text-success'
                      : 'border-orange-500 bg-orange-500/20 text-orange-400'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Strike Price */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Strike Price ($)</label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.strikePrice || ''}
            onChange={e => set('strikePrice', parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Expiration Date */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Expiration Date</label>
          <input
            required
            type="date"
            min={new Date().toISOString().split('T')[0]}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.expirationDate}
            onChange={e => set('expirationDate', e.target.value)}
          />
          {daysToExpiry !== null && (
            <p className={`text-xs ${daysToExpiry <= 7 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {daysToExpiry} days to expiry
            </p>
          )}
        </div>

        {/* Contracts */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Contracts</label>
          <input
            required
            type="number"
            min="1"
            step="1"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.contracts}
            onChange={e => set('contracts', parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-muted-foreground">1 contract = 100 shares</p>
        </div>

        {/* Premium per Contract */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Premium per Contract ($)</label>
          <input
            required
            type="number"
            min="0.0001"
            step="0.0001"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.premiumPerContract || ''}
            onChange={e => set('premiumPerContract', parseFloat(e.target.value) || 0)}
          />
          {form.premiumPerContract > 0 && form.contracts > 0 && (
            <p className="text-xs text-muted-foreground">
              Total: ${(form.premiumPerContract * form.contracts * 100).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Notes (optional)</label>
        <textarea
          rows={2}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Strategy context, hedge reason, etc."
          value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Log Options Position'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/options')}
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
