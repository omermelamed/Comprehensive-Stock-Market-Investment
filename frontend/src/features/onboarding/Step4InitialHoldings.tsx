import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/shared/section-header'
import { EmptyState } from '@/components/shared/empty-state'
import type { OnboardingData } from './useOnboarding'
import { ASSET_TYPES } from '@/data/onboarding'

type HoldingRow = {
  id: string
  symbol: string
  track: string
  quantity: number
  pricePerUnit: number
  transactionDate: string
}

function today(): string { return new Date().toISOString().slice(0, 10) }

let rowCounter = 0

interface Props {
  data: Partial<OnboardingData>
  onUpdate: (patch: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step4InitialHoldings({ data, onUpdate, onNext, onBack }: Props) {
  const [rows, setRows] = useState<HoldingRow[]>(() =>
    (data.initialHoldings ?? []).map((h, i) => ({ ...h, id: `h-${i}` })),
  )

  function addRow() {
    rowCounter += 1
    setRows(prev => [...prev, { id: `h-${rowCounter}`, symbol: '', track: 'ETF', quantity: 0, pricePerUnit: 0, transactionDate: today() }])
  }
  function removeRow(id: string) { setRows(prev => prev.filter(r => r.id !== id)) }
  function updateRow(id: string, patch: Partial<HoldingRow>) { setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r))) }

  function handleSkip() { onUpdate({ initialHoldings: [] }); onNext() }
  function handleNext() { onUpdate({ initialHoldings: rows.map(r => ({ ...r })) }); onNext() }

  const totalValue = rows.reduce((sum, r) => sum + r.quantity * r.pricePerUnit, 0)

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Import current holdings"
        description="Log what you already own, or skip to start fresh."
      />

      <div className="rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5 text-xs text-muted-foreground">
        Holdings are logged as BUY transactions at the prices you enter.
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No existing holdings"
          description="Already own positions? Add them here."
          action={
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add holding
            </Button>
          }
        />
      ) : (
        <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
          <div className="grid grid-cols-[70px_90px_65px_75px_95px_28px] gap-1.5 px-1">
            {['Symbol', 'Track', 'Qty', 'Price', 'Date', ''].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold uppercase text-muted-foreground">{h}</span>
            ))}
          </div>

          <AnimatePresence>
            {rows.map(row => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-[70px_90px_65px_75px_95px_28px] items-center gap-1.5 rounded-xl border border-input bg-muted/30 p-2.5"
              >
                <Input className="h-8 bg-card font-mono uppercase text-xs" value={row.symbol}
                  onChange={e => updateRow(row.id, { symbol: e.target.value.toUpperCase() })} placeholder="VOO" />
                <select
                  className="h-8 w-full rounded-xl border border-input bg-card px-2 text-xs text-muted-foreground outline-none"
                  value={row.track} onChange={e => updateRow(row.id, { track: e.target.value })}
                >
                  {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <Input className="h-8 bg-card font-mono text-xs" type="number" min={0} step={0.0001}
                  value={row.quantity || ''} onChange={e => updateRow(row.id, { quantity: Number(e.target.value) })} placeholder="0" />
                <Input className="h-8 bg-card font-mono text-xs" type="number" min={0} step={0.01}
                  value={row.pricePerUnit || ''} onChange={e => updateRow(row.id, { pricePerUnit: Number(e.target.value) })} placeholder="0.00" />
                <Input className="h-8 bg-card text-xs" type="date" value={row.transactionDate}
                  onChange={e => updateRow(row.id, { transactionDate: e.target.value })} />
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
            <Plus className="h-3 w-3" /> Add holding
          </button>

          {totalValue > 0 && (
            <div className="flex justify-between px-1 pt-0.5 text-[11px] text-muted-foreground">
              <span>{rows.length} position{rows.length !== 1 ? 's' : ''}</span>
              <span>Cost basis: <span className="font-semibold tabular-nums text-foreground">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span></span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button variant="secondary" onClick={handleSkip}>Skip</Button>
        <Button onClick={handleNext} className="flex-1">Continue →</Button>
      </div>
    </div>
  )
}
