import { useEffect, useState } from 'react'
import { getTransactions, deleteTransaction } from '../../api/transactions'
import type { Transaction } from '../../types'
import { Card } from '@/components/ui/card'

const TYPE_STYLES: Record<string, string> = {
  BUY:        'bg-success/15 text-success',
  SELL:       'bg-destructive/15 text-destructive',
  SHORT:      'bg-warning/15 text-warning',
  COVER:      'bg-warning/15 text-warning',
  DIVIDEND:   'bg-primary/15 text-primary',
  DEPOSIT:    'bg-primary/15 text-primary',
  WITHDRAWAL: 'bg-muted text-muted-foreground',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const result = await getTransactions(0, 20)
      setTransactions(result.content)
      setTotal(result.totalElements)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleDelete(id: number) {
    setDeleting(id)
    try {
      await deleteTransaction(id)
      await load()
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 mt-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-muted-foreground py-8">
        No transactions yet. Log your first one above.
      </p>
    )
  }

  return (
    <Card className="mt-8">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-base font-semibold text-foreground">
          Recent Transactions
        </h2>
        {total > 20 && (
          <span className="text-xs text-muted-foreground">{total} total</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
              <th className="px-3 pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Symbol</th>
              <th className="px-3 pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</th>
              <th className="px-3 pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Qty</th>
              <th className="px-3 pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Price</th>
              <th className="px-3 pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</th>
              <th className="px-6 pb-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{tx.transactionDate}</td>
                <td className="px-3 py-3 font-mono font-semibold text-foreground">{tx.symbol}</td>
                <td className="px-3 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[tx.transactionType] ?? 'bg-muted text-muted-foreground'}`}>
                    {tx.transactionType}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-foreground">{tx.quantity}</td>
                <td className="px-3 py-3 text-right font-mono text-xs text-foreground">{fmt(tx.pricePerUnit)}</td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-foreground">{fmt(tx.totalAmount)}</td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => void handleDelete(tx.id)}
                    disabled={deleting === tx.id}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                  >
                    {deleting === tx.id ? '…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
