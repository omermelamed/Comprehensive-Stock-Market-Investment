import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OptionsTransaction } from '../../types'
import { OptionsStrategyPanel } from './OptionsStrategyPanel'

interface Props {
  positions: OptionsTransaction[]
  onClose: (id: string, status: 'EXPIRED' | 'EXERCISED' | 'CLOSED') => void
  onDelete: (id: string) => void
}

function pnlColor(pnl: number | null): string {
  if (pnl === null) return 'text-muted-foreground'
  return pnl >= 0 ? 'text-success' : 'text-destructive'
}

function dteColor(days: number): string {
  if (days <= 7) return 'text-destructive font-semibold'
  if (days <= 14) return 'text-warning'
  return 'text-foreground'
}

function fmt(v: number | null, decimals = 2, prefix = ''): string {
  if (v === null) return '—'
  return `${prefix}${v.toFixed(decimals)}`
}

export function OptionsPositionsTable({ positions, onClose, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [strategySymbol, setStrategySymbol] = useState<string | null>(null)

  if (positions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No options positions logged yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {strategySymbol && (
        <OptionsStrategyPanel
          symbol={strategySymbol}
          onClose={() => setStrategySymbol(null)}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Position</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Contracts</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Entry Premium</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total Cost</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">P&amp;L</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">DTE</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {positions.map(pos => {
              const label = `${pos.underlyingSymbol} $${pos.strikePrice} ${pos.optionType} ${pos.expirationDate}`
              const isExpanded = expandedId === pos.id

              return [
                <tr
                  key={pos.id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    isExpanded && 'bg-muted/20'
                  )}
                >
                  {/* Position label */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : pos.id)}
                      className="flex items-center gap-1 text-left font-mono text-xs font-medium"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      <span>{label}</span>
                      <span className={cn(
                        'ml-2 rounded px-1.5 py-0.5 text-xs font-semibold',
                        pos.action === 'BUY' ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-500'
                      )}>
                        {pos.action}
                      </span>
                    </button>
                  </td>

                  {/* Contracts */}
                  <td className="px-4 py-3 text-right font-mono">{pos.contracts}</td>

                  {/* Entry premium */}
                  <td className="px-4 py-3 text-right font-mono">${fmt(pos.premiumPerContract, 4)}</td>

                  {/* Total cost */}
                  <td className="px-4 py-3 text-right font-mono">${fmt(pos.totalPremium)}</td>

                  {/* P&L */}
                  <td className={cn('px-4 py-3 text-right font-mono', pnlColor(pos.pnl))}>
                    {pos.pnl !== null ? (
                      <>
                        {pos.pnl >= 0 ? '+' : ''}${fmt(pos.pnl)}
                        {pos.pnlPercent !== null && (
                          <span className="ml-1 text-xs">
                            ({pos.pnlPercent >= 0 ? '+' : ''}{fmt(pos.pnlPercent)}%)
                          </span>
                        )}
                      </>
                    ) : '—'}
                  </td>

                  {/* DTE */}
                  <td className={cn('px-4 py-3 text-right font-mono', dteColor(pos.daysToExpiry))}>
                    {pos.daysToExpiry}d
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      pos.status === 'ACTIVE' && 'bg-success/15 text-success',
                      pos.status === 'EXPIRED' && 'bg-destructive/15 text-destructive',
                      pos.status === 'EXERCISED' && 'bg-primary/15 text-primary',
                      pos.status === 'CLOSED' && 'bg-muted text-muted-foreground',
                    )}>
                      {pos.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {pos.status === 'ACTIVE' && (
                        <select
                          className="rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground"
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value) {
                              onClose(pos.id, e.target.value as 'EXPIRED' | 'EXERCISED' | 'CLOSED')
                              e.target.value = ''
                            }
                          }}
                        >
                          <option value="" disabled>Close…</option>
                          <option value="EXPIRED">Expired</option>
                          <option value="EXERCISED">Exercised</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      )}
                      {confirmDelete === pos.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { onDelete(pos.id); setConfirmDelete(null) }}
                            className="rounded bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="rounded border border-border px-2 py-0.5 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(pos.id)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>,

                isExpanded && (
                  <tr key={`${pos.id}-expand`} className="bg-muted/10">
                    <td colSpan={8} className="px-6 py-3">
                      <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
                        {pos.notes && <span><span className="font-medium text-foreground">Notes:</span> {pos.notes}</span>}
                        <span><span className="font-medium text-foreground">Executed:</span> {new Date(pos.executedAt).toLocaleDateString()}</span>
                        <button
                          onClick={() => setStrategySymbol(pos.underlyingSymbol)}
                          className="ml-auto rounded bg-purple-600/10 px-3 py-1 text-xs font-medium text-purple-400 hover:bg-purple-600/20"
                        >
                          Get AI Strategy for {pos.underlyingSymbol}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
