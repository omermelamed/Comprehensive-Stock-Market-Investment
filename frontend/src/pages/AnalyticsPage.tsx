import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { stagger, staggerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import {
  getAnalytics,
  type AnalyticsResponse,
  type PerformanceMetrics,
} from '@/api/analytics'
import { ExportButton } from '@/features/export/ExportButton'
import { downloadPerformance } from '@/api/export'

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'] as const
type Range = (typeof RANGES)[number]

function fmtPct(v: number | null): string {
  if (v === null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function fmtCurrency(v: number, currency = 'USD'): string {
  return v.toLocaleString('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDecimal(v: number | null, places = 2): string {
  if (v === null) return '—'
  return v.toFixed(places)
}

interface MetricCardProps {
  label: string
  value: string
  positive?: boolean | null
}

function MetricCard({ label, value, positive }: MetricCardProps) {
  const colorClass =
    positive === null || positive === undefined
      ? 'text-foreground'
      : positive
      ? 'text-green-400'
      : 'text-red-400'

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-xl font-bold', colorClass)}>{value}</p>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

function metricsPositive(key: keyof PerformanceMetrics, value: number | null): boolean | null {
  if (value === null) return null
  if (key === 'maxDrawdownPct') return value >= 0 // drawdown is negative, closer to 0 is better
  if (key === 'costBasisReturnPct' || key === 'snapshotPeriodReturnPct' || key === 'annualizedReturnPct') {
    return value >= 0
  }
  return null
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('1Y')
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getAnalytics(range)
      .then(res => {
        if (!cancelled) setData(res)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [range])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>

        <div className="flex items-center gap-3">
          <ExportButton label="Export P&L" onDownload={downloadPerformance} />
          {/* Range tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                range === r
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r}
            </button>
          ))}
          </div>
        </div>
      </div>

      {loading && !data && <AnalyticsSkeleton />}

      {error && !data && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          {/* Metric cards */}
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <MetricCard
              label="Total Return (Cost Basis)"
              value={fmtPct(data.performanceMetrics.costBasisReturnPct)}
              positive={metricsPositive('costBasisReturnPct', data.performanceMetrics.costBasisReturnPct)}
            />
            <MetricCard
              label="Annualized Return"
              value={fmtPct(data.performanceMetrics.annualizedReturnPct)}
              positive={metricsPositive('annualizedReturnPct', data.performanceMetrics.annualizedReturnPct)}
            />
            <MetricCard
              label="Volatility (Ann.)"
              value={data.performanceMetrics.volatilityAnnualizedPct !== null
                ? `${data.performanceMetrics.volatilityAnnualizedPct.toFixed(2)}%`
                : '—'}
            />
            <MetricCard
              label="Max Drawdown"
              value={data.performanceMetrics.maxDrawdownPct !== null
                ? `${data.performanceMetrics.maxDrawdownPct.toFixed(2)}%`
                : '—'}
              positive={data.performanceMetrics.maxDrawdownPct !== null
                ? data.performanceMetrics.maxDrawdownPct >= -5
                : null}
            />
            <MetricCard
              label="Sharpe Ratio"
              value={fmtDecimal(data.performanceMetrics.sharpeRatio)}
              positive={data.performanceMetrics.sharpeRatio !== null
                ? data.performanceMetrics.sharpeRatio >= 1
                : null}
            />
          </motion.div>

          {/* Portfolio vs benchmark chart */}
          {data.chartPoints.length > 0 && (
            <motion.div variants={staggerItem} className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Portfolio Index vs Benchmark</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={(() => {
                  const benchmarkByDate = new Map(
                    (data.benchmark?.points ?? []).map(p => [p.date, p.benchmarkIndex])
                  )
                  return data.chartPoints.map(p => ({
                    date: p.date,
                    portfolio: Number(p.portfolioIndex.toFixed(2)),
                    benchmark: benchmarkByDate.has(p.date)
                      ? Number(benchmarkByDate.get(p.date)!.toFixed(2))
                      : undefined,
                  }))
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={d => d.slice(5)}
                    minTickGap={40}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={v => `${v}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="portfolio"
                    name="Portfolio"
                    stroke="hsl(var(--primary))"
                    dot={false}
                    strokeWidth={2}
                  />
                  {data.benchmark && (
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      name={data.benchmark.symbol}
                      stroke="hsl(var(--muted-foreground))"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Position P&L bar chart */}
          {data.positions.length > 0 && (
            <motion.div variants={staggerItem} className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Position P&L</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.positions.map(p => ({ symbol: p.symbol, pnl: Number(p.pnlAbsolute.toFixed(0)), positive: p.pnlAbsolute >= 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="symbol" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => fmtCurrency(v, data.currency)} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [fmtCurrency(v, data.currency), 'P&L']}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {data.positions.map((p, i) => (
                      <Cell
                        key={i}
                        fill={p.pnlAbsolute >= 0 ? 'hsl(var(--chart-2, 142 76% 36%))' : 'hsl(var(--chart-1, 0 72% 51%))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Realized P&L */}
          <motion.div variants={staggerItem} className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Realized P&L</h2>
            {data.realizedPnl && data.realizedPnl.trades.length > 0 ? (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total Realized:</span>
                  <span className={cn(
                    'font-mono text-lg font-bold',
                    data.realizedPnl.totalRealizedPnl >= 0 ? 'text-green-400' : 'text-red-400',
                  )}>
                    {fmtCurrency(data.realizedPnl.totalRealizedPnl, data.currency)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="pb-2 text-left font-medium">Symbol</th>
                        <th className="pb-2 text-right font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Buy Price</th>
                        <th className="pb-2 text-right font-medium">Sell Price</th>
                        <th className="pb-2 text-right font-medium">P&L</th>
                        <th className="pb-2 text-right font-medium">%</th>
                        <th className="pb-2 text-right font-medium">Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.realizedPnl.trades.map((t, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="py-2 font-mono font-semibold text-foreground">{t.symbol}</td>
                          <td className="py-2 text-right font-mono">{t.quantity}</td>
                          <td className="py-2 text-right font-mono">{fmtCurrency(t.buyPrice, data.currency)}</td>
                          <td className="py-2 text-right font-mono">{fmtCurrency(t.sellPrice, data.currency)}</td>
                          <td className={cn('py-2 text-right font-mono', t.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                            {fmtCurrency(t.pnl, data.currency)}
                          </td>
                          <td className={cn('py-2 text-right font-mono', t.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400')}>
                            {fmtPct(t.pnlPercent)}
                          </td>
                          <td className="py-2 text-right text-muted-foreground">{t.closedAt.slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No closed trades in this period.</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
