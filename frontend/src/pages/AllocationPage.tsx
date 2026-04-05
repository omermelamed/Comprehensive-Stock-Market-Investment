import { useEffect, useState } from 'react'
import { getAllocations, bulkReplaceAllocations } from '@/api/allocations'
import { Card, CardContent } from '@/components/ui/card'
import { ASSET_TYPES } from '@/data/onboarding'
import type { TargetAllocation } from '@/types'

const inputClass =
  'rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

type DraftRow = {
  id: string          // local draft id (may not exist in backend yet)
  symbol: string
  assetType: string
  label: string
  targetPercentage: number
  displayOrder: number
}

let draftCounter = 0

function toDraft(a: TargetAllocation): DraftRow {
  return {
    id: String(a.id),
    symbol: a.symbol,
    assetType: a.assetType,
    label: a.label,
    targetPercentage: a.targetPercentage,
    displayOrder: a.displayOrder,
  }
}

export default function AllocationPage() {
  const [rows, setRows] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getAllocations()
      .then(data => setRows(data.map(toDraft)))
      .catch(() => setError('Failed to load allocations.'))
      .finally(() => setLoading(false))
  }, [])

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    setSaved(false)
  }

  function addRow() {
    draftCounter += 1
    setRows(prev => [
      ...prev,
      {
        id: `new-${draftCounter}`,
        symbol: '',
        assetType: 'ETF',
        label: '',
        targetPercentage: 0,
        displayOrder: prev.length,
      },
    ])
    setSaved(false)
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    setSaved(false)
  }

  async function handleSave() {
    // Validate
    for (const r of rows) {
      if (!r.symbol.trim()) { setError('All rows must have a symbol.'); return }
    }
    const total = rows.reduce((s, r) => s + r.targetPercentage, 0)
    if (Math.abs(total - 100) > 0.01) {
      setError(`Allocations must sum to 100%. Currently: ${total.toFixed(2)}%`)
      return
    }

    setError(null)
    setSaving(true)
    try {
      const payload = rows.map((r, i) => ({
        symbol: r.symbol.trim().toUpperCase(),
        assetType: r.assetType,
        label: r.label.trim() || r.symbol.trim().toUpperCase(),
        targetPercentage: r.targetPercentage,
        displayOrder: i,
      }))
      const updated = await bulkReplaceAllocations(payload)
      setRows((updated as TargetAllocation[]).map(toDraft))
      setSaved(true)
    } catch {
      setError('Failed to save allocations. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const total = rows.reduce((s, r) => s + (Number(r.targetPercentage) || 0), 0)
  const totalOk = Math.abs(total - 100) <= 0.01

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-8 py-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Target Allocations</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Define how your portfolio should be distributed across positions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-mono font-semibold ${totalOk ? 'text-success' : 'text-destructive'}`}>
            {total.toFixed(2)}% / 100%
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-8">
        {error && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <p className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            Allocations saved.
          </p>
        )}

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Symbol</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Label</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Asset Type</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Target %</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-2">
                      <input
                        className={`${inputClass} w-28 font-mono uppercase`}
                        placeholder="AAPL"
                        value={row.symbol}
                        onChange={e => updateRow(row.id, { symbol: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${inputClass} w-40`}
                        placeholder="e.g. S&P 500"
                        value={row.label}
                        onChange={e => updateRow(row.id, { label: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={`${inputClass} w-36`}
                        value={row.assetType}
                        onChange={e => updateRow(row.id, { assetType: e.target.value })}
                      >
                        {ASSET_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          className={`${inputClass} w-24 text-right font-mono`}
                          value={row.targetPercentage}
                          onChange={e => updateRow(row.id, { targetPercentage: Number(e.target.value) })}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-2 text-right">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No allocations yet. Add your first position below.
              </p>
            )}

            <div className="border-t border-border px-6 py-3">
              <button
                onClick={addRow}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add position
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
