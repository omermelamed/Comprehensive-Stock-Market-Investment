import { CheckCircle2 } from 'lucide-react'
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
  const investable = allocations.filter(a => a.amount > 0)
  const total = investable.reduce((s, a) => s + a.amount, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {confirmResult ? (
          <div className="p-6 text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <div>
              <p className="text-lg font-semibold text-card-foreground">Investment Confirmed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {confirmResult.transactionsCreated} transaction{confirmResult.transactionsCreated !== 1 ? 's' : ''} logged
              </p>
            </div>
            <p className="tabular-nums font-mono text-3xl font-bold text-card-foreground">
              {fmt(confirmResult.totalInvested)}
            </p>
            <button
              onClick={onDone}
              className="w-full cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Confirm Investment</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The following BUY transactions will be logged to your ledger.
              </p>
            </div>

            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {investable.map(a => (
                <li key={a.symbol} className="flex items-center justify-between px-4 py-3 bg-muted/20">
                  <span className="font-mono text-sm font-semibold text-card-foreground">{a.symbol}</span>
                  <span className="tabular-nums font-mono text-sm font-medium text-card-foreground">{fmt(a.amount)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between px-4 py-3 bg-muted/40">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="tabular-nums font-mono text-sm font-bold text-card-foreground">{fmt(total)}</span>
              </li>
            </ul>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isConfirming}
                className="flex-1 cursor-pointer rounded-lg border border-border py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className="flex-1 cursor-pointer rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
