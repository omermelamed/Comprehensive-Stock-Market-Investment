import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, ColorType, type IChartApi, type ISeriesApi, type LineData } from 'lightweight-charts'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import { useCurrency } from '@/contexts/currency-context'
import {
  getAnalytics,
  getAnalyticsBenchmark,
  getMonthlyReturns,
  type AnalyticsResponse,
  type AnalyticsPerformanceMetrics,
  type AnalyticsBenchmark,
  type MonthlyReturnEntry,
  type MonthlyReturnsResponse,
} from '@/api/analytics'
import { getTargetAllocations } from '@/api/allocations'
import type { TargetAllocation } from '@/types'

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'] as const

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'monthly', label: 'Monthly Returns' },
  { id: 'pnl', label: 'Positions P&L' },
] as const

type TabId = (typeof TABS)[number]['id']

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, decimals = 2, suffix = '%'): string {
  if (value === null || value === undefined) return 'N/A'
  const abs = Math.abs(value)
  const sign = value >= 0 ? '+' : '−'
  return `${sign}${abs.toFixed(decimals)}${suffix}`
}

function fmtPlain(value: number | null | undefined, decimals = 2, suffix = '%'): string {
  if (value === null || value === undefined) return 'N/A'
  return `${value.toFixed(decimals)}${suffix}`
}

function returnColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-muted-foreground'
  return value >= 0 ? 'text-success' : 'text-destructive'
}

// ── MetricCard ────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  subLabel?: string
  className?: string
  colored?: boolean
  rawValue?: number | null
}

function MetricCard({ label, value, subLabel, colored, rawValue }: MetricCardProps) {
  const colorClass = colored ? returnColor(rawValue) : 'text-foreground'
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-xl font-bold', colorClass)}>{value}</p>
      {subLabel && <p className="mt-0.5 text-xs text-muted-foreground">{subLabel}</p>}
    </div>
  )
}

// ── PerformanceChart ──────────────────────────────────────────────────────────

interface ChartProps {
  points: { date: string; portfolioIndex: number }[]
  benchmark: AnalyticsBenchmark | null
  loading: boolean
}

function PerformanceChart({ points, benchmark, loading }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const portfolioSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const benchmarkSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const mutedFg = resolveColor('--color-muted-foreground', '#64748b')
    const border = resolveColor('--color-border', '#e2e8f0')
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 240,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: mutedFg, fontSize: 11 },
      grid: { vertLines: { color: border, style: 1 }, horzLines: { color: border, style: 1 } },
      crosshair: { vertLine: { color: '#6366f1', width: 1, labelBackgroundColor: '#6366f1' }, horzLine: { color: '#6366f1', width: 1, labelBackgroundColor: '#6366f1' } },
      timeScale: { borderColor: border, timeVisible: true },
      rightPriceScale: { borderColor: border },
      handleScroll: false,
      handleScale: false,
    })
    portfolioSeriesRef.current = chart.addLineSeries({ color: '#6366f1', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: 'Portfolio' })
    benchmarkSeriesRef.current = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, lineStyle: 2, title: 'SPY' })
    chartRef.current = chart
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) chart.applyOptions({ width: entry.contentRect.width })
    })
    observer.observe(containerRef.current)
    return () => { observer.disconnect(); chart.remove(); portfolioSeriesRef.current = null; benchmarkSeriesRef.current = null; chartRef.current = null }
  }, [])

  useEffect(() => {
    if (!portfolioSeriesRef.current) return
    const data: LineData[] = points.map(p => ({ time: p.date as LineData['time'], value: p.portfolioIndex }))
    portfolioSeriesRef.current.setData(data)
    if (data.length > 0) chartRef.current?.timeScale().fitContent()
  }, [points])

  useEffect(() => {
    if (!benchmarkSeriesRef.current) return
    const data: LineData[] = benchmark
      ? benchmark.points.map(p => ({ time: p.date as LineData['time'], value: p.benchmarkIndex }))
      : []
    benchmarkSeriesRef.current.setData(data)
  }, [benchmark])

  return loading ? (
    <div className="h-60 animate-pulse rounded-xl bg-muted" />
  ) : (
    <div ref={containerRef} className="w-full" />
  )
}

function resolveColor(cssVar: string, fallback: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || fallback
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return fallback
  ctx.fillStyle = raw
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}

// ── PositionsTable ────────────────────────────────────────────────────────────

function PositionsTable({
  positions,
  currency,
  showPnlBars,
}: {
  positions: AnalyticsResponse['positions']
  currency: string
  showPnlBars?: boolean
}) {
  if (positions.length === 0) return null
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Position Breakdown</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Symbol</th>
              {showPnlBars && <th className="px-4 py-2 text-left font-medium w-[140px]">P&L % bar</th>}
              <th className="px-4 py-2 text-right font-medium">Value</th>
              <th className="px-4 py-2 text-right font-medium">Cost Basis</th>
              <th className="px-4 py-2 text-right font-medium">P&L</th>
              <th className="px-4 py-2 text-right font-medium">P&L %</th>
              <th className="px-4 py-2 text-right font-medium">Weight</th>
            </tr>
          </thead>
          <tbody>
            {positions.map(p => (
              <tr key={p.symbol} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <div>
                    <span className="font-mono text-xs font-semibold text-foreground">{p.symbol}</span>
                    {p.label && p.label !== p.symbol && (
                      <span className="ml-1.5 text-xs text-muted-foreground">{p.label}</span>
                    )}
                  </div>
                </td>
                {showPnlBars && (
                  <td className="px-4 py-2.5 align-middle">
                    <PnlBar pnlPercent={p.pnlPercent} />
                  </td>
                )}
                <td className="px-4 py-2.5 text-right font-mono text-xs">{formatMoney(p.currentValue, currency)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{formatMoney(p.costBasis, currency)}</td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-xs font-medium', p.pnlAbsolute >= 0 ? 'text-success' : 'text-destructive')}>
                  {p.pnlAbsolute >= 0 ? '+' : ''}{formatMoney(p.pnlAbsolute, currency)}
                </td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-xs font-medium', p.pnlPercent >= 0 ? 'text-success' : 'text-destructive')}>
                  {fmt(p.pnlPercent)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                  {fmtPlain(p.portfolioWeightPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PnlBar({ pnlPercent }: { pnlPercent: number }) {
  const cap = 50
  const t = Math.min(Math.abs(pnlPercent) / cap, 1)
  const halfPct = t * 50
  const pos = pnlPercent >= 0
  return (
    <div className="relative mx-auto h-3 w-full max-w-[120px] rounded-sm bg-muted/80">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-px bg-border" />
      {pos ? (
        <div
          className="absolute left-1/2 top-0.5 h-2 rounded-r bg-success"
          style={{ width: `${halfPct}%` }}
        />
      ) : (
        <div
          className="absolute right-1/2 top-0.5 h-2 rounded-l bg-destructive"
          style={{ width: `${halfPct}%` }}
        />
      )}
    </div>
  )
}

function AllocationAccuracyChart({
  targets,
  positions,
}: {
  targets: TargetAllocation[]
  positions: AnalyticsResponse['positions']
}) {
  if (targets.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No target allocations configured.</p>
    )
  }
  const bySymbol = new Map(positions.map(p => [p.symbol, p.portfolioWeightPct]))
  const sorted = [...targets].sort((a, b) => a.displayOrder - b.displayOrder)
  return (
    <div className="space-y-4">
      {sorted.map(t => {
        const current = bySymbol.get(t.symbol) ?? 0
        const target = t.targetPercentage
        return (
          <div key={t.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-foreground">{t.symbol}</span>
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground">{fmtPlain(current)}</span>
                {' vs '}
                <span className="text-foreground">{fmtPlain(target)}</span>
                {' target'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Target</p>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-indigo-500/90"
                    style={{ width: `${Math.min(Math.max(target, 0), 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Current</p>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      Math.abs(current - target) <= 1 ? 'bg-success/90' : 'bg-amber-500/90',
                    )}
                    style={{ width: `${Math.min(Math.max(current, 0), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthlyReturnsChart({
  months,
  currency,
  loading,
}: {
  months: MonthlyReturnEntry[]
  currency: string
  loading: boolean
}) {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted" />
  }
  if (months.length === 0) {
    return <p className="text-sm text-muted-foreground">No monthly return data for this range.</p>
  }
  const maxAbs = Math.max(...months.map(m => Math.abs(m.returnPct)), 1e-6)
  const best = months.reduce((a, b) => (a.returnPct >= b.returnPct ? a : b))
  const worst = months.reduce((a, b) => (a.returnPct <= b.returnPct ? a : b))
  const avg = months.reduce((s, m) => s + m.returnPct, 0) / months.length

  const label = (m: string) => {
    const d = new Date(m.length === 7 ? `${m}-01` : m)
    return Number.isNaN(d.getTime()) ? m : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Best month" value={fmt(best.returnPct)} subLabel={label(best.month)} colored rawValue={best.returnPct} />
        <MetricCard label="Worst month" value={fmt(worst.returnPct)} subLabel={label(worst.month)} colored rawValue={worst.returnPct} />
        <MetricCard label="Average monthly return" value={fmt(avg)} subLabel={`${months.length} months`} colored rawValue={avg} />
      </div>
      <div className="space-y-3">
        {months.map(m => {
          const w = (Math.abs(m.returnPct) / maxAbs) * 50
          const pos = m.returnPct >= 0
          return (
            <div key={m.month} className="flex items-center gap-3">
              <div className="w-24 shrink-0 text-xs text-muted-foreground">{label(m.month)}</div>
              <div className="relative h-6 min-w-0 flex-1 rounded bg-muted/60">
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-px bg-border" />
                {pos ? (
                  <div
                    className="absolute left-1/2 top-1 h-4 rounded-r bg-success"
                    style={{ width: `${w}%` }}
                  />
                ) : (
                  <div
                    className="absolute right-1/2 top-1 h-4 rounded-l bg-destructive"
                    style={{ width: `${w}%` }}
                  />
                )}
              </div>
              <div className="w-28 shrink-0 text-right font-mono text-xs">
                <span className={returnColor(m.returnPct)}>{fmt(m.returnPct)}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {m.returnAbsolute >= 0 ? '+' : ''}{formatMoney(m.returnAbsolute, currency)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RealizedTradesTable({
  trades,
  totalRealizedPnl,
  currency,
}: {
  trades: NonNullable<AnalyticsResponse['realizedPnl']>['trades']
  totalRealizedPnl: number
  currency: string
}) {
  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">No closed trades in range.</p>
        <p className="mt-2 font-mono text-lg font-semibold text-foreground">
          Total realized P&amp;L:{' '}
          <span className={totalRealizedPnl >= 0 ? 'text-success' : 'text-destructive'}>
            {totalRealizedPnl >= 0 ? '+' : ''}{formatMoney(totalRealizedPnl, currency)}
          </span>
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Realized P&amp;L</h3>
        <p className="font-mono text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className={cn('font-semibold', totalRealizedPnl >= 0 ? 'text-success' : 'text-destructive')}>
            {totalRealizedPnl >= 0 ? '+' : ''}{formatMoney(totalRealizedPnl, currency)}
          </span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Symbol</th>
              <th className="px-4 py-2 text-right font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Buy</th>
              <th className="px-4 py-2 text-right font-medium">Sell</th>
              <th className="px-4 py-2 text-right font-medium">P&amp;L</th>
              <th className="px-4 py-2 text-right font-medium">P&amp;L %</th>
              <th className="px-4 py-2 text-right font-medium">Closed</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={`${t.symbol}-${t.closedAt}-${i}`} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-xs font-semibold">{t.symbol}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">{t.quantity}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">{formatMoney(t.buyPrice, currency)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">{formatMoney(t.sellPrice, currency)}</td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-xs font-medium', t.pnl >= 0 ? 'text-success' : 'text-destructive')}>
                  {t.pnl >= 0 ? '+' : ''}{formatMoney(t.pnl, currency)}
                </td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-xs', t.pnlPercent >= 0 ? 'text-success' : 'text-destructive')}>
                  {fmt(t.pnlPercent)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                  {new Date(t.closedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── AnalyticsPage ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const currency = useCurrency()
  const [range, setRange] = useState<string>('3M')
  const [tab, setTab] = useState<TabId>('overview')
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [targets, setTargets] = useState<TargetAllocation[]>([])
  const [benchmarkSymbol, setBenchmarkSymbol] = useState('SPY')
  const [benchmarkOverlay, setBenchmarkOverlay] = useState<AnalyticsBenchmark | null>(null)
  const [benchmarkLoading, setBenchmarkLoading] = useState(false)
  const [monthlyReturns, setMonthlyReturns] = useState<MonthlyReturnsResponse | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)

  const load = useCallback((r: string) => {
    setLoading(true)
    setError(null)
    getAnalytics(r)
      .then(setData)
      .catch(() => setError('Failed to load analytics. Check that the backend is running.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(range) }, [range, load])

  useEffect(() => {
    getTargetAllocations()
      .then(setTargets)
      .catch(() => setTargets([]))
  }, [])

  useEffect(() => {
    setMonthlyLoading(true)
    getMonthlyReturns(range)
      .then(setMonthlyReturns)
      .catch(() => setMonthlyReturns(null))
      .finally(() => setMonthlyLoading(false))
  }, [range])

  useEffect(() => {
    if (tab !== 'benchmark') return
    const sym = benchmarkSymbol.trim() || 'SPY'
    let cancelled = false
    setBenchmarkLoading(true)
    getAnalyticsBenchmark(sym, range)
      .then(b => {
        if (!cancelled) setBenchmarkOverlay(b)
      })
      .catch(() => {
        if (!cancelled) setBenchmarkOverlay(null)
      })
      .finally(() => {
        if (!cancelled) setBenchmarkLoading(false)
      })
    return () => { cancelled = true }
  }, [tab, benchmarkSymbol, range])

  const m: AnalyticsPerformanceMetrics | null = data?.performanceMetrics ?? null
  const chartBenchmark = tab === 'benchmark' ? benchmarkOverlay : (data?.benchmark ?? null)
  const legendSymbol = (tab === 'benchmark' ? benchmarkOverlay : data?.benchmark)?.symbol ?? 'SPY'

  const portfolioPeriodPct = m?.snapshotPeriodReturnPct ?? null
  const benchPeriodPct = tab === 'benchmark' ? benchmarkOverlay?.periodReturnPct ?? null : data?.benchmark?.periodReturnPct ?? null
  const alpha =
    portfolioPeriodPct != null && benchPeriodPct != null ? portfolioPeriodPct - benchPeriodPct : null

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Performance and risk metrics derived from snapshot history.
        </p>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Time range</h2>
              <div className="flex items-center gap-1">
                {RANGES.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      range === r
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-border pb-2">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                  tab === t.id
                    ? 'bg-card text-foreground border border-border'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Portfolio Value</h2>
                </div>
                <PerformanceChart points={data?.chartPoints ?? []} benchmark={chartBenchmark} loading={loading && !data} />
                {!loading && data && (
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 rounded bg-indigo-500" />
                      <span className="text-xs text-muted-foreground">Portfolio (indexed to 100)</span>
                    </div>
                    {data.benchmark && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-px w-4 border-t-2 border-dashed border-amber-500" />
                        <span className="text-xs text-muted-foreground">{data.benchmark.symbol} (indexed to 100)</span>
                      </div>
                    )}
                  </div>
                )}
                {m && m.snapshotCount === 0 && !loading && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    No snapshot history yet. Snapshots are created daily — check back tomorrow.
                  </p>
                )}
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Returns</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricCard
                    label="Total return (cost basis)"
                    value={m ? fmt(m.costBasisReturnPct) : '—'}
                    subLabel={m ? formatMoney(m.costBasisReturnAbsolute, currency) : undefined}
                    colored
                    rawValue={m?.costBasisReturnPct}
                  />
                  <MetricCard
                    label={`Portfolio (${range})`}
                    value={m ? fmt(m.snapshotPeriodReturnPct) : '—'}
                    subLabel={m?.periodStart ? `${m.periodStart} → ${m.periodEnd}` : undefined}
                    colored
                    rawValue={m?.snapshotPeriodReturnPct}
                  />
                  <MetricCard
                    label={`SPY (${range})`}
                    value={data?.benchmark ? fmt(data.benchmark.periodReturnPct) : 'N/A'}
                    subLabel={data?.benchmark ? 'benchmark' : 'unavailable'}
                    colored
                    rawValue={data?.benchmark?.periodReturnPct ?? null}
                  />
                  <MetricCard
                    label="Annualized return"
                    value={m ? fmt(m.annualizedReturnPct) : '—'}
                    subLabel="compound"
                    colored
                    rawValue={m?.annualizedReturnPct}
                  />
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Risk</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricCard
                    label="Volatility (annualized)"
                    value={m ? fmtPlain(m.volatilityAnnualizedPct) : '—'}
                    subLabel={m?.snapshotCount !== undefined && m.snapshotCount < 6 ? 'need 6+ snapshots' : 'std dev of daily returns'}
                  />
                  <MetricCard
                    label="Max drawdown"
                    value={m?.maxDrawdownPct !== null && m?.maxDrawdownPct !== undefined
                      ? `−${m.maxDrawdownPct.toFixed(2)}%`
                      : 'N/A'}
                    subLabel="peak-to-trough"
                  />
                  <MetricCard
                    label="Sharpe ratio"
                    value={fmtPlain(m?.sharpeRatio, 2, '')}
                    subLabel="vs 4.5% risk-free rate"
                    colored
                    rawValue={m?.sharpeRatio}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-4 text-sm font-semibold text-foreground">Allocation accuracy</h2>
                <AllocationAccuracyChart targets={targets} positions={data?.positions ?? []} />
              </div>
            </>
          )}

          {tab === 'benchmark' && (
            <>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-foreground">Portfolio vs benchmark</h2>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Benchmark</span>
                    <input
                      type="text"
                      value={benchmarkSymbol}
                      onChange={e => setBenchmarkSymbol(e.target.value.toUpperCase())}
                      className="w-24 rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground"
                      placeholder="SPY"
                      aria-label="Benchmark symbol"
                    />
                  </label>
                </div>
                <PerformanceChart points={data?.chartPoints ?? []} benchmark={chartBenchmark} loading={loading && !data} />
                {!loading && data && (
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 rounded bg-indigo-500" />
                      <span className="text-xs text-muted-foreground">Portfolio (indexed to 100)</span>
                    </div>
                    {benchmarkOverlay && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-px w-4 border-t-2 border-dashed border-amber-500" />
                        <span className="text-xs text-muted-foreground">{benchmarkOverlay.symbol} (indexed to 100)</span>
                      </div>
                    )}
                    {benchmarkLoading && !benchmarkOverlay && (
                      <span className="text-xs text-muted-foreground">Loading benchmark…</span>
                    )}
                  </div>
                )}
                {m && m.snapshotCount === 0 && !loading && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    No snapshot history yet. Snapshots are created daily — check back tomorrow.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetricCard
                  label={`Portfolio (${range})`}
                  value={m ? fmt(m.snapshotPeriodReturnPct) : '—'}
                  subLabel={m?.periodStart ? `${m.periodStart} → ${m.periodEnd}` : undefined}
                  colored
                  rawValue={m?.snapshotPeriodReturnPct}
                />
                <MetricCard
                  label={`${legendSymbol} (${range})`}
                  value={benchmarkOverlay ? fmt(benchmarkOverlay.periodReturnPct) : benchmarkLoading ? '…' : 'N/A'}
                  subLabel="benchmark period return"
                  colored
                  rawValue={benchmarkOverlay?.periodReturnPct ?? null}
                />
                <MetricCard
                  label="Alpha (vs benchmark)"
                  value={alpha != null ? fmt(alpha) : 'N/A'}
                  subLabel="portfolio − benchmark"
                  colored
                  rawValue={alpha}
                />
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">Period comparison</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">Metric</th>
                        <th className="px-4 py-2 text-right font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="px-4 py-2.5 text-foreground">Portfolio return</td>
                        <td className={cn('px-4 py-2.5 text-right font-mono text-xs font-medium', returnColor(portfolioPeriodPct))}>
                          {portfolioPeriodPct != null ? fmt(portfolioPeriodPct) : 'N/A'}
                        </td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="px-4 py-2.5 text-foreground">Benchmark return ({benchmarkSymbol.trim() || 'SPY'})</td>
                        <td className={cn('px-4 py-2.5 text-right font-mono text-xs font-medium', returnColor(benchPeriodPct))}>
                          {benchPeriodPct != null ? fmt(benchPeriodPct) : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-foreground">Alpha</td>
                        <td className={cn('px-4 py-2.5 text-right font-mono text-xs font-medium', returnColor(alpha))}>
                          {alpha != null ? fmt(alpha) : 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === 'monthly' && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Monthly returns</h2>
              <MonthlyReturnsChart
                months={monthlyReturns?.months ?? []}
                currency={monthlyReturns?.currency ?? data?.currency ?? currency}
                loading={monthlyLoading}
              />
            </div>
          )}

          {tab === 'pnl' && (
            <div className="space-y-6">
              {data && <PositionsTable positions={data.positions} currency={currency} showPnlBars />}
              {data?.realizedPnl && (
                <RealizedTradesTable
                  trades={data.realizedPnl.trades}
                  totalRealizedPnl={data.realizedPnl.totalRealizedPnl}
                  currency={currency}
                />
              )}
            </div>
          )}

          {loading && !data && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
