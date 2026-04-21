import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { stagger, staggerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import {
  getAnalytics,
  getFeesSummary,
  type AnalyticsResponse,
  type FeesSummary,
  type PerformanceMetrics,
  type PositionPnl,
} from '@/api/analytics'
import { ExportButton } from '@/features/export/ExportButton'
import { downloadPerformance } from '@/api/export'
import { chart, seriesColor, pnlClass } from '@/lib/chart-theme'
import { UniversalChart } from '@/components/charts'
import { HoldingsHistoryChart } from '@/features/dashboard/HoldingsHistoryChart'

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
      ? 'text-success'
      : 'text-destructive'

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 tabular-nums font-mono text-xl font-bold', colorClass)}>{value}</p>
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
  const [feesSummary, setFeesSummary] = useState<FeesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFeesSummary()
      .then(setFeesSummary)
      .catch(() => setFeesSummary({ totalFees: 0, monthlyFees: [], symbolFees: [] }))
  }, [])

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
    <div>
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
          <div className="flex items-center gap-3">
            <ExportButton label="Export P&L" onDownload={downloadPerformance} />
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
      </div>

      <div className="p-6 space-y-5">
      {loading && !data && <AnalyticsSkeleton />}

      {error && !data && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
          {/* Metric cards */}
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
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
            <MetricCard
              label="Total Fees Paid"
              value={feesSummary != null ? fmtCurrency(feesSummary.totalFees, data.currency) : '—'}
            />
          </motion.div>

          {/* Portfolio vs benchmark chart */}
          {data.chartPoints.length > 0 && (
            <motion.div variants={staggerItem} className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Portfolio Index vs Benchmark</h2>
              <BenchmarkChart data={data} />
            </motion.div>
          )}

          {/* Position P&L */}
          {data.positions.length > 0 && (
            <motion.div variants={staggerItem} className="rounded-xl border border-border bg-card p-5">
              <PositionPnlChart positions={data.positions} currency={data.currency} />
            </motion.div>
          )}

          {/* Holdings performance */}
          <motion.div variants={staggerItem}>
            <HoldingsHistoryChart />
          </motion.div>

          {/* Fees chart — cost drag context near performance */}
          {feesSummary && feesSummary.totalFees > 0 && (
            <motion.div variants={staggerItem} className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Monthly Fees</h2>
              <FeesChart data={feesSummary} currency={data.currency} />
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
                    'tabular-nums font-mono text-lg font-bold',
                    data.realizedPnl.totalRealizedPnl >= 0 ? 'text-success' : 'text-destructive',
                  )}>
                    {fmtCurrency(data.realizedPnl.totalRealizedPnl, data.currency)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Symbol</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buy Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sell Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">P&L</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">%</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.realizedPnl.trades.map((t, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-foreground">{t.symbol}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-mono text-sm">{t.quantity}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-mono text-sm">{fmtCurrency(t.buyPrice, data.currency)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-mono text-sm">{fmtCurrency(t.sellPrice, data.currency)}</td>
                          <td className={cn('px-4 py-3 text-right tabular-nums font-mono text-sm', t.pnl >= 0 ? 'text-success' : 'text-destructive')}>
                            {fmtCurrency(t.pnl, data.currency)}
                          </td>
                          <td className={cn('px-4 py-3 text-right tabular-nums font-mono text-sm', t.pnlPercent >= 0 ? 'text-success' : 'text-destructive')}>
                            {fmtPct(t.pnlPercent)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">{t.closedAt.slice(0, 10)}</td>
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
    </div>
  )
}

/* ── Benchmark chart (extracted for UniversalChart) ──────── */

function BenchmarkChart({ data }: { data: AnalyticsResponse }) {
  const chartData = useMemo(() => {
    const benchmarkByDate = new Map(
      (data.benchmark?.points ?? []).map(p => [p.date, p.benchmarkIndex]),
    )
    return data.chartPoints.map(p => ({
      date: p.date,
      portfolio: Number(p.portfolioIndex.toFixed(2)),
      ...(benchmarkByDate.has(p.date)
        ? { benchmark: Number(benchmarkByDate.get(p.date)!.toFixed(2)) }
        : {}),
    }))
  }, [data])

  const series = useMemo(() => {
    const s: Array<{ dataKey: string; name: string; color?: string; strokeWidth?: number; strokeDasharray?: string }> = [
      { dataKey: 'portfolio', name: 'Portfolio', color: chart.primary, strokeWidth: 2.5 },
    ]
    if (data.benchmark) {
      s.push({
        dataKey: 'benchmark',
        name: data.benchmark.symbol,
        color: chart.muted,
        strokeWidth: 1.5,
        strokeDasharray: '6 3',
      })
    }
    return s
  }, [data.benchmark])

  return (
    <UniversalChart
      chartId="analytics-benchmark"
      timeSeries={{
        data: chartData,
        xDataKey: 'date',
        series,
        xTickFormatter: (d) => d.slice(5),
        yTickFormatter: (v) => `${v}`,
        yDomain: ['auto', 'auto'],
        showLegend: true,
      }}
      defaultType="line"
      allowedTypes={['line', 'area']}
      height={280}
    />
  )
}

/* ── Position P&L chart (extracted for UniversalChart) ───── */

function PositionPnlChart({ positions, currency }: { positions: PositionPnl[]; currency: string }) {
  const sorted = useMemo(
    () => [...positions].sort((a, b) => b.pnlAbsolute - a.pnlAbsolute),
    [positions],
  )
  const totalPnl = sorted.reduce((s, p) => s + p.pnlAbsolute, 0)

  const chartData = useMemo(
    () => sorted.map((p, i) => ({
      name: p.symbol,
      value: Number(p.pnlAbsolute.toFixed(0)),
      color: seriesColor(i),
    })),
    [sorted],
  )

  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Position P&L</h2>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">Total:</span>
          <span className={cn('tabular-nums font-mono text-sm font-bold', pnlClass(totalPnl))}>
            {totalPnl >= 0 ? '+' : ''}{fmtCurrency(totalPnl, currency)}
          </span>
        </div>
      </div>
      <UniversalChart
        chartId="analytics-position-pnl"
        data={chartData}
        defaultType="bar"
        allowedTypes={['bar', 'donut']}
        height={Math.max(240, sorted.length * 48 + 40)}
        formatValue={(v) => `${v >= 0 ? '+' : ''}${fmtCurrency(v, currency)}`}
        formatCenterValue={(total) => `${total >= 0 ? '+' : ''}${fmtCurrency(total, currency)}`}
        centerLabel="Total P&L"
      />
    </>
  )
}

function FeesChart({ data, currency }: { data: FeesSummary; currency: string }) {
  const chartData = useMemo(
    () => data.monthlyFees.map(m => ({
      name: m.month,
      value: Number(m.fees.toFixed(2)),
    })),
    [data],
  )

  return (
    <UniversalChart
      chartId="analytics-fees"
      data={chartData}
      defaultType="bar"
      allowedTypes={['bar']}
      height={240}
      formatValue={(v) => fmtCurrency(v, currency)}
    />
  )
}
