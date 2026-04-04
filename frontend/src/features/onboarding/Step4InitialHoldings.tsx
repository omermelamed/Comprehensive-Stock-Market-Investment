import { useState } from 'react'
import type { OnboardingData } from './useOnboarding'

type HoldingRow = {
  id: string
  symbol: string
  track: string
  quantity: number
  pricePerUnit: number
  transactionDate: string
}

const TRACKS = ['LONG_EQUITY', 'CRYPTO', 'REIT', 'BOND']

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  data: Partial<OnboardingData>
  onUpdate: (patch: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

let rowCounter = 0

export default function Step4InitialHoldings({ data, onUpdate, onNext, onBack }: Props) {
  const [rows, setRows] = useState<HoldingRow[]>(() =>
    (data.initialHoldings ?? []).map((h, i) => ({ ...h, id: `h-${i}` }))
  )

  function addRow() {
    rowCounter += 1
    setRows(prev => [
      ...prev,
      {
        id: `h-${rowCounter}`,
        symbol: '',
        track: 'LONG_EQUITY',
        quantity: 0,
        pricePerUnit: 0,
        transactionDate: today(),
      },
    ])
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id: string, patch: Partial<HoldingRow>) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }

  function handleSkip() {
    onUpdate({ initialHoldings: [] })
    onNext()
  }

  function handleNext() {
    onUpdate({ initialHoldings: rows.map(r => ({ ...r })) })
    onNext()
  }

  const inputClass =
    'bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500'

  return (
    <div className="space-y-6">
      <p className="text-gray-400 text-sm">
        Optionally enter your existing holdings. These will be logged as BUY transactions with the prices you provide.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-700">
              <th className="text-left py-2 pr-2">Symbol</th>
              <th className="text-left py-2 pr-2">Track</th>
              <th className="text-left py-2 pr-2">Qty</th>
              <th className="text-left py-2 pr-2">Price</th>
              <th className="text-left py-2 pr-2">Date</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-gray-700/50">
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    className={`${inputClass} w-20`}
                    value={row.symbol}
                    onChange={e => updateRow(row.id, { symbol: e.target.value.toUpperCase() })}
                    placeholder="VOO"
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    className={`${inputClass} w-28`}
                    value={row.track}
                    onChange={e => updateRow(row.id, { track: e.target.value })}
                  >
                    {TRACKS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    className={`${inputClass} w-20`}
                    min={0}
                    step={0.0001}
                    value={row.quantity}
                    onChange={e => updateRow(row.id, { quantity: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    className={`${inputClass} w-24`}
                    min={0}
                    step={0.01}
                    value={row.pricePerUnit}
                    onChange={e => updateRow(row.id, { pricePerUnit: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="date"
                    className={`${inputClass} w-36`}
                    value={row.transactionDate}
                    onChange={e => updateRow(row.id, { transactionDate: e.target.value })}
                  />
                </td>
                <td className="py-2">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-gray-500 hover:text-red-400 font-bold text-lg leading-none"
                    title="Remove"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">No holdings added. You can skip this step.</p>
      )}

      <button
        onClick={addRow}
        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
      >
        + Add row
      </button>

      <div className="flex justify-between">
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
          onClick={onBack}
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg font-medium"
            onClick={handleSkip}
          >
            Skip
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            onClick={handleNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
