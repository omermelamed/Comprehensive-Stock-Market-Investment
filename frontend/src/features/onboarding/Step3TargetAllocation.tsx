import { useState } from 'react'
import type { OnboardingData } from './useOnboarding'

type AllocationRow = {
  id: string
  symbol: string
  assetType: string
  targetPercentage: number
  label: string
  displayOrder: number
}

const ASSET_TYPES = ['STOCK', 'ETF', 'CRYPTO', 'BOND', 'REIT', 'CASH', 'OTHER']

function AllocationTotalBar({ total }: { total: number }) {
  const pct = Math.min(total, 100)
  const color =
    total === 100 ? 'bg-green-500' : total > 100 ? 'bg-red-500' : 'bg-yellow-500'
  const textColor =
    total === 100 ? 'text-green-400' : total > 100 ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Total allocation</span>
        <span className={`font-mono font-medium ${textColor}`}>{total.toFixed(2)}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {total !== 100 && (
        <p className={`text-xs ${textColor}`}>
          {total > 100 ? `Over by ${(total - 100).toFixed(2)}%` : `${(100 - total).toFixed(2)}% remaining`}
        </p>
      )}
    </div>
  )
}

interface Props {
  data: Partial<OnboardingData>
  onUpdate: (patch: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

let rowCounter = 0

export default function Step3TargetAllocation({ data, onUpdate, onNext, onBack }: Props) {
  const [rows, setRows] = useState<AllocationRow[]>(() =>
    (data.allocations ?? []).map((a, i) => ({ ...a, id: `row-${i}` }))
  )

  function addRow() {
    rowCounter += 1
    setRows(prev => [
      ...prev,
      {
        id: `row-${rowCounter}`,
        symbol: '',
        assetType: 'ETF',
        targetPercentage: 0,
        label: '',
        displayOrder: prev.length + 1,
      },
    ])
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id: string, patch: Partial<AllocationRow>) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }

  const total = rows.reduce((sum, r) => sum + (r.targetPercentage || 0), 0)

  const symbols = rows.map(r => r.symbol.trim().toUpperCase()).filter(Boolean)
  const hasDuplicates = symbols.length !== new Set(symbols).size
  const canProceed = Math.abs(total - 100) < 0.001 && !hasDuplicates && rows.length > 0

  function handleNext() {
    onUpdate({
      allocations: rows.map((r, i) => ({
        symbol: r.symbol.trim().toUpperCase(),
        assetType: r.assetType,
        targetPercentage: r.targetPercentage,
        label: r.label,
        displayOrder: i + 1,
      })),
    })
    onNext()
  }

  const inputClass =
    'bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500'

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-700">
              <th className="text-left py-2 pr-2">Symbol</th>
              <th className="text-left py-2 pr-2">Type</th>
              <th className="text-left py-2 pr-2">Label</th>
              <th className="text-left py-2 pr-2">%</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-gray-700/50">
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    className={`${inputClass} w-24`}
                    value={row.symbol}
                    onChange={e => updateRow(row.id, { symbol: e.target.value })}
                    placeholder="VOO"
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    className={`${inputClass} w-24`}
                    value={row.assetType}
                    onChange={e => updateRow(row.id, { assetType: e.target.value })}
                  >
                    {ASSET_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    className={`${inputClass} w-32`}
                    value={row.label}
                    onChange={e => updateRow(row.id, { label: e.target.value })}
                    placeholder="Label"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    className={`${inputClass} w-20`}
                    min={0.01}
                    max={100}
                    step={0.01}
                    value={row.targetPercentage}
                    onChange={e => updateRow(row.id, { targetPercentage: Number(e.target.value) })}
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
        <p className="text-gray-500 text-sm text-center py-4">No allocations yet. Add a row to get started.</p>
      )}

      <button
        onClick={addRow}
        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
      >
        + Add row
      </button>

      {hasDuplicates && (
        <p className="text-red-400 text-xs">Duplicate symbols detected. Each symbol must be unique.</p>
      )}

      <AllocationTotalBar total={total} />

      <div className="flex justify-between">
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
          onClick={onBack}
        >
          Back
        </button>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleNext}
          disabled={!canProceed}
        >
          Next
        </button>
      </div>
    </div>
  )
}
