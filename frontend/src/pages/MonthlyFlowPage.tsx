import { useState } from 'react'
import { useMonthlyFlow } from '@/features/monthly-flow/useMonthlyFlow'
import { MonthlyBudgetInput } from '@/features/monthly-flow/MonthlyBudgetInput'
import { PositionAllocationCard } from '@/features/monthly-flow/PositionAllocationCard'
import { AllocationSummaryFooter } from '@/features/monthly-flow/AllocationSummaryFooter'
import { ConfirmInvestmentDialog } from '@/features/monthly-flow/ConfirmInvestmentDialog'

export default function MonthlyFlowPage() {
  const [showDialog, setShowDialog] = useState(false)
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

  function handleConfirmRequest() {
    setShowDialog(true)
  }

  function handleConfirm() {
    confirmFlow()
  }

  function handleDone() {
    setShowDialog(false)
    reset()
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-foreground">Monthly Investment</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Enter your budget and review suggested allocations.
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Budget input row */}
          <div className="flex items-center gap-4">
            <MonthlyBudgetInput
              budget={budget}
              onChange={setBudget}
              onPreview={loadPreview}
              isLoading={isLoadingPreview}
            />
            {preview && (
              <p className="text-sm text-muted-foreground">
                Portfolio total:{' '}
                <span className="font-mono font-semibold text-foreground">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                    preview.portfolioTotal
                  )}
                </span>
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Missing prices warning */}
          {preview && preview.missingPrices.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              <span className="font-semibold">Prices unavailable: </span>
              {preview.missingPrices.join(', ')} — suggestions for these positions are set to $0.
            </div>
          )}

          {/* Position cards */}
          {preview && preview.positions.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {preview.positions.map((pos) => (
                <PositionAllocationCard
                  key={pos.symbol}
                  position={pos}
                  amount={overrides[pos.symbol] ?? pos.suggestedAmount.toFixed(2)}
                  onAmountChange={(v) => setOverride(pos.symbol, v)}
                  isLoadingSummary={isLoadingSummaries && !pos.aiSummary}
                />
              ))}
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
            <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Enter a monthly budget and click Preview to see suggested allocations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer (only show when preview loaded) */}
      {preview && preview.positions.length > 0 && (
        <AllocationSummaryFooter
          budget={parsedBudget}
          totalAllocated={totalAllocated}
          remaining={remaining}
          onConfirm={handleConfirmRequest}
          isConfirming={isConfirming}
        />
      )}

      {/* Confirmation dialog */}
      {showDialog && (
        <ConfirmInvestmentDialog
          allocations={effectiveAllocations}
          isConfirming={isConfirming}
          confirmResult={confirmResult}
          onConfirm={handleConfirm}
          onClose={() => setShowDialog(false)}
          onDone={handleDone}
        />
      )}
    </div>
  )
}
