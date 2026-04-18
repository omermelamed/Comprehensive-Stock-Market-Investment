import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTransactionForm } from '../features/transactions/useTransactionForm'
import SymbolAutocomplete from '../features/transactions/SymbolAutocomplete'
import TransactionList from '../features/transactions/TransactionList'
import { getAllocations } from '../api/allocations'
import { Card, CardContent } from '@/components/ui/card'
import { ExportButton } from '@/features/export/ExportButton'
import { downloadTransactions } from '@/api/export'
import type { TargetAllocation } from '../types'

import { ASSET_TRACKS } from '../data/onboarding'

const TRANSACTION_TYPES = ['BUY', 'SELL', 'SHORT', 'COVER', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL'] as const
const CURRENCIES = ['USD', 'ILS', 'EUR', 'GBP']

const labelClass = 'block text-sm font-medium text-muted-foreground mb-1.5'
const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function TransactionFormPage() {
  const [searchParams] = useSearchParams()
  const [allocations, setAllocations] = useState<TargetAllocation[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [listKey, setListKey] = useState(0)

  useEffect(() => {
    getAllocations()
      .then(setAllocations)
      .catch(() => setAllocations([]))
  }, [])

  const { formData, setField, submit, submitting, error } = useTransactionForm(() => {
    setSuccessMessage('Transaction logged successfully.')
    setListKey(k => k + 1)
    setTimeout(() => setSuccessMessage(null), 3000)
  })

  useEffect(() => {
    const prefilledSymbol = searchParams.get('symbol')
    if (prefilledSymbol) {
      setField('symbol', prefilledSymbol.toUpperCase())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submit()
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Log Transaction</h1>
          <div className="flex items-center gap-2">
            <Link
              to="/import"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Import CSV / Excel
            </Link>
            <ExportButton label="Export Transactions" onDownload={downloadTransactions} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={e => void handleSubmit(e)} className="space-y-5">
                {/* Symbol */}
                <div>
                  <label className={labelClass}>Symbol *</label>
                  <SymbolAutocomplete
                    value={formData.symbol}
                    onChange={v => setField('symbol', v)}
                    allocations={allocations}
                  />
                </div>

                {/* Type + Track */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Transaction Type</label>
                    <select
                      className={inputClass}
                      value={formData.transactionType}
                      onChange={e => setField('transactionType', e.target.value as typeof formData.transactionType)}
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
                      value={formData.track}
                      onChange={e => setField('track', e.target.value)}
                    >
                      {ASSET_TRACKS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Qty + Price + Fees */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Quantity</label>
                    <input
                      type="number"
                      className={inputClass}
                      min={0}
                      step={0.0001}
                      value={formData.quantity}
                      onChange={e => setField('quantity', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Price Per Unit</label>
                    <input
                      type="number"
                      className={inputClass}
                      min={0}
                      step={0.01}
                      value={formData.pricePerUnit}
                      onChange={e => setField('pricePerUnit', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fees</label>
                    <input
                      type="number"
                      className={inputClass}
                      min={0}
                      step={0.01}
                      value={formData.fees}
                      onChange={e => setField('fees', Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Currency + Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Currency</label>
                    <select
                      className={inputClass}
                      value={formData.currency}
                      onChange={e => setField('currency', e.target.value)}
                    >
                      {CURRENCIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={formData.transactionDate}
                      onChange={e => setField('transactionDate', e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={formData.notes}
                    onChange={e => setField('notes', e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>

                {/* Error / success */}
                {error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                    {successMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || formData.symbol.trim() === ''}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Transaction'}
                </button>
              </form>
            </CardContent>
          </Card>

          <TransactionList key={listKey} />
        </div>
      </div>
    </div>
  )
}
