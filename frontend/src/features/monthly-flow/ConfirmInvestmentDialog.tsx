import type { MonthlyFlowConfirmResult } from '@/types'
import { useCurrency } from '@/contexts/currency-context'
import { formatMoney } from '@/lib/currency'

interface Props {
  allocations: { symbol: string; amount: number }[]
  isConfirming: boolean
  confirmResult: MonthlyFlowConfirmResult | null
  onConfirm: () => void
  onClose: () => void
  onDone: () => void
}

export function ConfirmInvestmentDialog({
  allocations,
  isConfirming,
  confirmResult,
  onConfirm,
  onClose,
  onDone,
}: Props) {
  const currency = useCurrency()
  const fmt = (v: number) => formatMoney(v, currency)
  const investable = allocations.filter((a) => a.amount > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        {confirmResult ? (
          /* Success state */
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-card-foreground">Investment confirmed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {confirmResult.transactionsCreated} transaction{confirmResult.transactionsCreated !== 1 ? 's' : ''} logged
              </p>
            </div>
            <p className="font-mono text-3xl font-bold text-card-foreground">
              {fmt(confirmResult.totalInvested)}
            </p>
            <button
              onClick={onDone}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        ) : (
          /* Confirmation state */
          <div className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-card-foreground">Confirm investment</h2>
            <p className="text-sm text-muted-foreground">
              The following BUY transactions will be logged in your ledger.
            </p>

            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {investable.map((a) => (
                <li key={a.symbol} className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-mono text-sm font-medium text-card-foreground">{a.symbol}</span>
                  <span className="font-mono text-sm text-card-foreground">{fmt(a.amount)}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={isConfirming}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-card-foreground hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isConfirming ? 'Confirming…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
