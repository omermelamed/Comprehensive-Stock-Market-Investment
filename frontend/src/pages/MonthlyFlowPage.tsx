import { useState } from 'react'
import { Wallet, TrendingUp, ArrowRight } from 'lucide-react'
import { useMonthlyFlow } from '@/features/monthly-flow/useMonthlyFlow'
import { useCurrency } from '@/contexts/currency-context'
import { formatMoney, getCurrencySymbol } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { PositionAllocationCard } from '@/features/monthly-flow/PositionAllocationCard'
import { ConfirmInvestmentDialog } from '@/features/monthly-flow/ConfirmInvestmentDialog'
import { UniversalChart } from '@/components/charts'

export default function MonthlyFlowPage() {
  const [showDialog, setShowDialog] = useState(false)
  const currency = useCurrency()
  const sym = getCurrencySymbol(currency)
  const fmt = (v: number) => formatMoney(v, currency)
  const {
    budget,
    setBudget,
    preview,
    overrides,
    isLoadingPreview,
    isLoadingSummaries,
    isConfirming,
    confirmResult,
    error,
    parsedBudget,
    effectiveAllocations,
    totalAllocated,
    remaining,
    loadPreview,
    setOverride,
    confirmFlow,
    reset,
  } = useMonthlyFlow()

  const isOverBudget = remaining < 0
  const canConfirm = !isOverBudget && totalAllocated > 0 && !isConfirming
  const investable = effectiveAllocations.filter(e => e.amount > 0)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') loadPreview()
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">Monthly Investment</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Set budget, review allocations, confirm.</p>
            </div>
          </div>
          {preview && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Portfolio: <span className="tabular-nums font-mono font-semibold text-foreground">{fmt(preview.portfolioTotal)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* ── Step 1: Budget entry ────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <label htmlFor="budget-input" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Monthly Budget
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {sym}
                  </span>
                  <input
                    id="budget-input"
                    type="number"
                    min="0"
                    step="100"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="6,000"
                    className="w-full rounded-lg border border-input bg-background py-2.5 pl-8 pr-4 tabular-nums font-mono text-lg font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all sm:w-56"
                  />
                </div>
              </div>
              <button
                onClick={loadPreview}
                disabled={isLoadingPreview || !budget}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingPreview ? 'Loading…' : 'Preview Allocations'}
                {!isLoadingPreview && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Missing prices */}
          {preview && preview.missingPrices.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              <span className="font-semibold">Prices unavailable: </span>
              {preview.missingPrices.join(', ')} — suggestions are set to $0.
            </div>
          )}

          {/* ── Step 2: Allocation overview + chart ─────────────── */}
          {preview && totalAllocated > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Allocation Overview</h2>

              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                {/* Left: summary stats in a clean grid */}
                <div className="space-y-4">
                  {/* Budget / Allocated / Remaining summary bar */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Budget</p>
                      <p className="mt-1 tabular-nums font-mono text-base font-bold text-foreground">{fmt(parsedBudget)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Allocated</p>
                      <p className="mt-1 tabular-nums font-mono text-base font-bold text-foreground">{fmt(totalAllocated)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Remaining</p>
                      <p className={cn(
                        'mt-1 tabular-nums font-mono text-base font-bold',
                        isOverBudget ? 'text-destructive' : 'text-success',
                      )}>{fmt(remaining)}</p>
                    </div>
                  </div>

                  {/* Budget utilization bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Budget utilization</span>
                      <span className="tabular-nums font-mono font-medium">
                        {parsedBudget > 0 ? ((totalAllocated / parsedBudget) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isOverBudget ? 'bg-destructive' : 'bg-primary',
                        )}
                        style={{ width: `${Math.min(100, parsedBudget > 0 ? (totalAllocated / parsedBudget) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Per-position breakdown list */}
                  <div className="space-y-1.5">
                    {investable.map(e => {
                      const pct = parsedBudget > 0 ? (e.amount / parsedBudget) * 100 : 0
                      return (
                        <div key={e.symbol} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/30">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-semibold text-foreground">{e.symbol}</span>
                              <span className="tabular-nums font-mono text-sm font-medium text-foreground">{fmt(e.amount)}</span>
                            </div>
                            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="w-10 text-right tabular-nums font-mono text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right: donut chart */}
                <div className="flex flex-col items-center justify-center">
                  <UniversalChart
                    chartId="monthly-flow-split"
                    data={[
                      ...investable.map(e => ({ name: e.symbol, value: e.amount })),
                      ...(remaining > 0 ? [{ name: 'Remaining', value: remaining, color: 'rgba(128,128,128,0.2)' }] : []),
                    ]}
                    defaultType="donut"
                    allowedTypes={['donut', 'bar']}
                    height={240}
                    formatCenterValue={(t) => fmt(t)}
                    centerLabel="Allocated"
                    formatValue={v => fmt(v)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Position cards ──────────────────────────── */}
          {preview && preview.positions.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Edit Allocations</h2>
                <p className="text-xs text-muted-foreground">{preview.positions.length} positions</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {preview.positions.map(pos => (
                  <PositionAllocationCard
                    key={pos.symbol}
                    position={pos}
                    amount={overrides[pos.symbol] ?? pos.suggestedAmount.toFixed(2)}
                    onAmountChange={v => setOverride(pos.symbol, v)}
                    isLoadingSummary={isLoadingSummaries && !pos.aiSummary}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {preview && preview.positions.length === 0 && (
            <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No target allocations found. Set up your target allocation first.
              </p>
            </div>
          )}

          {/* Initial empty state */}
          {!preview && !isLoadingPreview && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
              <Wallet className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">
                Enter a monthly budget above to see suggested allocations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky CTA footer ────────────────────────────────── */}
      {preview && preview.positions.length > 0 && (
        <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-center gap-6">
              {[
                { label: 'Budget', value: fmt(parsedBudget), color: 'text-foreground' },
                { label: 'Allocated', value: fmt(totalAllocated), color: 'text-foreground' },
                { label: 'Remaining', value: fmt(remaining), color: isOverBudget ? 'text-destructive' : 'text-success' },
              ].map(s => (
                <div key={s.label} className="hidden sm:block">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className={cn('tabular-nums font-mono text-sm font-bold', s.color)}>{s.value}</p>
                </div>
              ))}
              <div className="sm:hidden">
                <p className={cn('tabular-nums font-mono text-sm font-bold', isOverBudget ? 'text-destructive' : 'text-foreground')}>
                  {fmt(totalAllocated)} <span className="text-xs font-normal text-muted-foreground">/ {fmt(parsedBudget)}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDialog(true)}
              disabled={!canConfirm}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConfirming ? 'Confirming…' : 'Confirm Investment'}
            </button>
          </div>
        </div>
      )}

      {showDialog && (
        <ConfirmInvestmentDialog
          allocations={effectiveAllocations}
          isConfirming={isConfirming}
          confirmResult={confirmResult}
          onConfirm={confirmFlow}
          onClose={() => setShowDialog(false)}
          onDone={() => { setShowDialog(false); reset() }}
        />
      )}
    </div>
  )
}
