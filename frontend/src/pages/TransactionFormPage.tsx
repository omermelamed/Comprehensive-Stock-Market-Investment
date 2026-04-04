import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransactionForm } from '../features/transactions/useTransactionForm'
import SymbolAutocomplete from '../features/transactions/SymbolAutocomplete'
import TransactionList from '../features/transactions/TransactionList'
import { getAllocations } from '../api/allocations'
import type { TargetAllocation } from '../types'

const TRANSACTION_TYPES = ['BUY', 'SELL', 'SHORT', 'COVER', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL'] as const
const TRACKS = ['LONG_EQUITY', 'SHORT', 'CRYPTO', 'OPTIONS', 'REIT', 'BOND']
const CURRENCIES = ['USD', 'ILS', 'EUR', 'GBP']

const labelClass = 'text-gray-400 text-sm block mb-1'
const inputClass =
  'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 w-full text-white focus:outline-none focus:border-blue-500'

export default function TransactionFormPage() {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submit()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">Log Transaction</h1>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className={labelClass}>Symbol *</label>
              <SymbolAutocomplete
                value={formData.symbol}
                onChange={v => setField('symbol', v)}
                allocations={allocations}
              />
            </div>

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
                  {TRACKS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

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

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-900/30 border border-green-500/50 rounded-lg px-4 py-3 text-green-400 text-sm">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || formData.symbol.trim() === ''}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Transaction'}
            </button>
          </form>
        </div>

        <TransactionList key={listKey} />
      </div>
    </div>
  )
}
