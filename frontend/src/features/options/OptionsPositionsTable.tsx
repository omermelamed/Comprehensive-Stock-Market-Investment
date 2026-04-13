import { useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OptionsPosition } from '@/api/options'

interface OptionsPositionsTableProps {
  positions: OptionsPosition[]
  onUpdateStatus: (id: string, status: 'EXPIRED' | 'EXERCISED' | 'CLOSED') => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function formatCurrency(v: number | null): string {
  if (v === null) return '—'
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function formatPnlPct(v: number | null): string {
  if (v === null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

const CLOSE_STATUSES = ['EXPIRED', 'EXERCISED', 'CLOSED'] as const

export function OptionsPositionsTable({ positions, onUpdateStatus, onDelete }: OptionsPositionsTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleStatusChange = async (id: string, status: 'EXPIRED' | 'EXERCISED' | 'CLOSED') => {
    setPendingId(id)
    try {
      await onUpdateStatus(id, status)
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this options position? This cannot be undone.')) return
    setPendingId(id)
    try {
      await onDelete(id)
    } finally {
      setPendingId(null)
    }
  }

  if (positions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No positions in this section.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Contract</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium text-right">Contracts</th>
            <th className="px-4 py-3 font-medium text-right">Premium Paid</th>
            <th className="px-4 py-3 font-medium text-right">Current</th>
            <th className="px-4 py-3 font-medium text-right">P&L</th>
            <th className="px-4 py-3 font-medium text-right">DTE</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => {
            const isPending = pendingId === pos.id
            const isActive = pos.status === 'ACTIVE'
            const pnlPositive = pos.pnl !== null && pos.pnl >= 0
            const dteWarning = pos.daysToExpiry < 7

            return (
              <tr
                key={pos.id}
                className={cn(
                  'border-b border-border last:border-0 transition-opacity',
                  isPending && 'opacity-50',
                )}
              >
                {/* Contract descriptor */}
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-foreground">
                    {pos.underlyingSymbol}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ${pos.strikePrice} {pos.expirationDate}
                  </span>
                </td>

                {/* Option type badge */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      pos.optionType === 'CALL'
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-orange-500/15 text-orange-400',
                    )}
                  >
                    {pos.optionType}
                  </span>
                </td>

                {/* Action badge */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      pos.action === 'BUY'
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-red-500/15 text-red-400',
                    )}
                  >
                    {pos.action}
                  </span>
                </td>

                <td className="px-4 py-3 text-right font-mono">{pos.contracts}</td>

                <td className="px-4 py-3 text-right font-mono text-foreground">
                  {formatCurrency(pos.totalPremium)}
                </td>

                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {pos.currentPremium !== null
                    ? formatCurrency(pos.currentPremium * pos.contracts * 100)
                    : '—'}
                </td>

                {/* P&L */}
                <td className="px-4 py-3 text-right">
                  {pos.pnl !== null ? (
                    <div className={cn('font-mono', pnlPositive ? 'text-green-400' : 'text-red-400')}>
                      <div>{formatCurrency(pos.pnl)}</div>
                      <div className="text-xs">{formatPnlPct(pos.pnlPercent)}</div>
                    </div>
                  ) : (
                    <span className="font-mono text-muted-foreground">—</span>
                  )}
                </td>

                {/* Days to expiry */}
                <td className={cn('px-4 py-3 text-right font-mono', dteWarning ? 'text-red-400 font-bold' : 'text-foreground')}>
                  {pos.daysToExpiry}
                </td>

                {/* Status badge */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      pos.status === 'ACTIVE' && 'bg-green-500/15 text-green-400',
                      pos.status === 'EXPIRED' && 'bg-muted text-muted-foreground',
                      pos.status === 'EXERCISED' && 'bg-blue-500/15 text-blue-400',
                      pos.status === 'CLOSED' && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {pos.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {isActive && (
                      <div className="relative">
                        <select
                          onChange={e => {
                            const v = e.target.value
                            if (v) handleStatusChange(pos.id, v as 'EXPIRED' | 'EXERCISED' | 'CLOSED')
                            e.target.value = ''
                          }}
                          disabled={isPending}
                          className={cn(
                            'appearance-none rounded-md border border-border bg-background px-2 py-1 pr-6 text-xs',
                            'text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
                            'cursor-pointer disabled:opacity-50',
                          )}
                          defaultValue=""
                        >
                          <option value="" disabled>Close as…</option>
                          {CLOSE_STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(pos.id)}
                      disabled={isPending}
                      aria-label="Delete position"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
