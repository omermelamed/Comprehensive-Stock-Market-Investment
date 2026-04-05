import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { SectionHeader } from '@/components/shared/section-header'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
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

let rowCounter = 0

interface Props {
  data: Partial<OnboardingData>
  onUpdate: (patch: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step3TargetAllocation({ data, onUpdate, onNext, onBack }: Props) {
  const [rows, setRows] = useState<AllocationRow[]>(() =>
    (data.allocations ?? []).map((a, i) => ({ ...a, id: `row-${i}` })),
  )

  function addRow() {
    rowCounter += 1
    setRows(prev => [
      ...prev,
      { id: `row-${rowCounter}`, symbol: '', assetType: 'ETF', targetPercentage: 0, label: '', displayOrder: prev.length + 1 },
    ])
  }

  function removeRow(id: string) { setRows(prev => prev.filter(r => r.id !== id)) }
  function updateRow(id: string, patch: Partial<AllocationRow>) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }

  const total = rows.reduce((sum, r) => sum + (r.targetPercentage || 0), 0)
  const symbols = rows.map(r => r.symbol.trim().toUpperCase()).filter(Boolean)
  const hasDuplicates = symbols.length !== new Set(symbols).size
  const canProceed = Math.abs(total - 100) < 0.001 && !hasDuplicates && rows.length > 0

  const totalColor = total === 100 ? 'text-success' : total > 100 ? 'text-destructive' : 'text-warning'
  const barIndicator = total === 100 ? 'bg-success' : total > 100 ? 'bg-destructive' : 'bg-warning'
  const barBg = total === 100 ? 'bg-success/5 border-success/20' : total > 100 ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-input'

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

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Build your target portfolio"
        description="These percentages drive every monthly suggestion. Must sum to 100%."
      />

      {/* Total bar */}
      <div className={cn('rounded-xl border p-3.5', barBg)}>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Total allocated</span>
          <span className={cn('text-sm font-bold tabular-nums', totalColor)}>{total.toFixed(1)}%</span>
        </div>
        <Progress value={total} indicatorClassName={barIndicator} />
        <p className={cn('mt-1 text-[11px]', totalColor)}>
          {total === 100 ? '✓ Allocations sum to 100%' : total > 100 ? `Over by ${(total - 100).toFixed(1)}%` : `${(100 - total).toFixed(1)}% remaining`}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No positions yet"
          description="e.g. VOO 60%, BND 30%, CASH 10%"
          action={
            <Button size="sm" onClick={addRow}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add first position
            </Button>
          }
        />
      ) : (
        <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
          <AnimatePresence>
            {rows.map(row => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-[75px_1fr_1fr_70px_30px] items-center gap-2 rounded-xl border border-input bg-muted/30 p-3"
              >
                <Input className="h-9 bg-card font-mono uppercase text-xs" value={row.symbol}
                  onChange={e => updateRow(row.id, { symbol: e.target.value })} placeholder="VOO" maxLength={10} />
                <Input className="h-9 bg-card text-xs" value={row.label}
                  onChange={e => updateRow(row.id, { label: e.target.value })} placeholder="Label" />
                <select
                  className="h-9 w-full rounded-xl border border-input bg-card px-3 text-xs text-muted-foreground outline-none"
                  value={row.assetType} onChange={e => updateRow(row.id, { assetType: e.target.value })}
                >
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="relative">
                  <Input className="h-9 bg-card pr-6 font-mono text-xs" type="number" min={0.01} max={100} step={0.1}
                    value={row.targetPercentage || ''} onChange={e => updateRow(row.id, { targetPercentage: Number(e.target.value) })} placeholder="0" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <button
                  onClick={() => removeRow(row.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          <button
            onClick={addRow}
            className="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-3 w-3" /> Add position
          </button>
        </div>
      )}

      {hasDuplicates && (
        <p className="text-xs text-destructive">⚠ Duplicate symbols — each must appear once.</p>
      )}

      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={canProceed ? handleNext : undefined} disabled={!canProceed} className="flex-1">
          Continue →
        </Button>
      </div>
    </div>
  )
}
