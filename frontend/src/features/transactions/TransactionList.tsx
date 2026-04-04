import { useEffect, useState } from 'react'
import { getTransactions, deleteTransaction } from '../../api/transactions'
import type { Transaction } from '../../types'

const TYPE_COLORS: Record<string, string> = {
  BUY: 'bg-green-700/40 text-green-300',
  SELL: 'bg-red-700/40 text-red-300',
  SHORT: 'bg-orange-700/40 text-orange-300',
  COVER: 'bg-yellow-700/40 text-yellow-300',
  DIVIDEND: 'bg-blue-700/40 text-blue-300',
  DEPOSIT: 'bg-purple-700/40 text-purple-300',
  WITHDRAWAL: 'bg-gray-600/40 text-gray-300',
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
          <div key={i} className="h-10 bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8 mt-6">
        No transactions yet. Log your first transaction above.
      </p>
    )
  }

  return (
    <div className="mt-8">
      <h2 className="text-gray-300 font-semibold text-sm mb-3">
        Recent Transactions {total > 20 && <span className="text-gray-500">({total} total)</span>}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-700">
              <th className="text-left py-2 pr-4">Date</th>
              <th className="text-left py-2 pr-4">Symbol</th>
              <th className="text-left py-2 pr-4">Type</th>
              <th className="text-right py-2 pr-4">Qty</th>
              <th className="text-right py-2 pr-4">Price</th>
              <th className="text-right py-2 pr-4">Total</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{tx.transactionDate}</td>
                <td className="py-2 pr-4 font-mono font-medium text-white">{tx.symbol}</td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[tx.transactionType] ?? 'bg-gray-600 text-gray-300'}`}>
                    {tx.transactionType}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right font-mono text-gray-300">{tx.quantity}</td>
                <td className="py-2 pr-4 text-right font-mono text-gray-300">{tx.pricePerUnit.toFixed(2)}</td>
                <td className="py-2 pr-4 text-right font-mono text-white">{tx.totalAmount.toFixed(2)}</td>
                <td className="py-2">
                  <button
                    onClick={() => void handleDelete(tx.id)}
                    disabled={deleting === tx.id}
                    className="text-gray-600 hover:text-red-400 text-xs disabled:opacity-40"
                    title="Delete"
                  >
                    {deleting === tx.id ? '…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
