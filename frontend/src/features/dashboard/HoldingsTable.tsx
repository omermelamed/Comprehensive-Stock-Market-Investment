import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { HoldingDashboard } from '@/api/portfolio'

type SortKey = keyof Pick<
  HoldingDashboard,
  'symbol' | 'currentValue' | 'pnlPercent' | 'currentPercent' | 'drift'
>

type SortDir = 'asc' | 'desc'

import { useCurrency } from '@/contexts/currency-context'
import { formatMoney } from '@/lib/currency'

function formatPercent(value: number, withSign = false): string {
  const sign = withSign && value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function formatQty(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(4)
}

type AllocationStatus = HoldingDashboard['allocationStatus']

function statusBadgeVariant(status: AllocationStatus) {
  switch (status) {
    case 'ON_TARGET': return 'success'
    case 'SLIGHTLY_OFF': return 'warning'
    case 'NEEDS_REBALANCING': return 'destructive'
    case 'UNTRACKED': return 'secondary'
  }
}

function statusLabel(status: AllocationStatus) {
  switch (status) {
    case 'ON_TARGET': return 'On target'
    case 'SLIGHTLY_OFF': return 'Slight drift'
    case 'NEEDS_REBALANCING': return 'Rebalance'
    case 'UNTRACKED': return 'Untracked'
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
  return dir === 'asc'
    ? <ArrowUp className="h-3 w-3" />
    : <ArrowDown className="h-3 w-3" />
}

interface Props {
  holdings: HoldingDashboard[]
}

export function HoldingsTable({ holdings }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('currentValue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const currency = useCurrency()
  const formatCurrency = (v: number) => formatMoney(v, currency)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...holdings].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    const an = av as number
    const bn = bv as number
    return sortDir === 'asc' ? an - bn : bn - an
  })

  return (
    <Card>
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Holdings</h2>
          <p className="text-sm text-muted-foreground">{holdings.length} position{holdings.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {holdings.length === 0 ? (
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No positions yet.{' '}
            <Link to="/transactions/new" className="text-primary underline-offset-4 hover:underline">
              Log your first transaction to get started.
            </Link>
          </p>
        </CardContent>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {/* Symbol */}
                <th className="px-6 pb-3 text-left">
                  <button
                    className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleSort('symbol')}
                  >
                    Symbol <SortIcon active={sortKey === 'symbol'} dir={sortDir} />
                  </button>
                </th>
                {/* Track */}
                <th className="px-3 pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Track
                </th>
                {/* Qty */}
                <th className="px-3 pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Qty
                </th>
                {/* Avg Buy */}
                <th className="px-3 pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Avg Buy
                </th>
                {/* Current Price */}
                <th className="px-3 pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Price
                </th>
                {/* Current Value */}
                <th className="px-3 pb-3 text-right">
                  <button
                    className="flex items-center gap-1 ml-auto text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleSort('currentValue')}
                  >
                    Value <SortIcon active={sortKey === 'currentValue'} dir={sortDir} />
                  </button>
                </th>
                {/* P&L */}
                <th className="px-3 pb-3 text-right">
                  <button
                    className="flex items-center gap-1 ml-auto text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleSort('pnlPercent')}
                  >
                    P&amp;L <SortIcon active={sortKey === 'pnlPercent'} dir={sortDir} />
                  </button>
                </th>
                {/* Target / Current % */}
                <th className="px-3 pb-3 text-right">
                  <button
                    className="flex items-center gap-1 ml-auto text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleSort('currentPercent')}
                  >
                    Alloc <SortIcon active={sortKey === 'currentPercent'} dir={sortDir} />
                  </button>
                </th>
                {/* Status */}
                <th className="px-6 pb-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(h => {
                const pnlPositive = h.pnlAbsolute >= 0
                return (
                  <tr key={h.symbol} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    {/* Symbol + Label */}
                    <td className="px-6 py-3.5">
                      <div className="font-bold">{h.symbol}</div>
                      {h.label && (
                        <div className="text-xs text-muted-foreground">{h.label}</div>
                      )}
                    </td>
                    {/* Track */}
                    <td className="px-3 py-3.5">
                      <Badge variant="secondary" className="text-xs">{h.track}</Badge>
                    </td>
                    {/* Qty */}
                    <td className="px-3 py-3.5 text-right font-mono text-xs">
                      {formatQty(h.quantity)}
                    </td>
                    {/* Avg Buy */}
                    <td className="px-3 py-3.5 text-right font-mono text-xs">
                      {formatCurrency(h.avgBuyPrice)}
                    </td>
                    {/* Current Price */}
                    <td className="px-3 py-3.5 text-right font-mono text-xs">
                      {formatCurrency(h.currentPrice)}
                    </td>
                    {/* Current Value */}
                    <td className="px-3 py-3.5 text-right font-mono text-sm font-semibold">
                      {formatCurrency(h.currentValue)}
                    </td>
                    {/* P&L */}
                    <td className="px-3 py-3.5 text-right">
                      <div
                        className={cn(
                          'font-mono text-xs font-semibold',
                          pnlPositive ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {pnlPositive ? '+' : ''}{formatCurrency(h.pnlAbsolute)}
                      </div>
                      <div
                        className={cn(
                          'text-xs',
                          pnlPositive ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {formatPercent(h.pnlPercent, true)}
                      </div>
                    </td>
                    {/* Target / Current % */}
                    <td className="px-3 py-3.5 text-right">
                      <div className="font-mono text-xs font-semibold">
                        {formatPercent(h.currentPercent)}
                      </div>
                      {h.targetPercent !== null && (
                        <div className="text-xs text-muted-foreground">
                          target {formatPercent(h.targetPercent)}
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-6 py-3.5 text-right">
                      <Badge variant={statusBadgeVariant(h.allocationStatus)}>
                        {statusLabel(h.allocationStatus)}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
