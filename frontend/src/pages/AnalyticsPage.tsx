import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, ColorType, type IChartApi, type ISeriesApi, type LineData } from 'lightweight-charts'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import { useCurrency } from '@/contexts/currency-context'
import { getAnalytics, type AnalyticsResponse, type AnalyticsPerformanceMetrics, type AnalyticsBenchmark } from '@/api/analytics'

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'] as const

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

function PositionsTable({ positions, currency }: { positions: AnalyticsResponse['positions']; currency: string }) {
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

// ── AnalyticsPage ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const currency = useCurrency()
  const [range, setRange] = useState<string>('3M')
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((r: string) => {
    setLoading(true)
    setError(null)
    getAnalytics(r)
      .then(setData)
      .catch(() => setError('Failed to load analytics. Check that the backend is running.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(range) }, [range, load])

  const m: AnalyticsPerformanceMetrics | null = data?.performanceMetrics ?? null

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
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

          {/* Value chart with range selector */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Portfolio Value</h2>
              <div className="flex items-center gap-1">
                {RANGES.map(r => (
                  <button
                    key={r}
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
            <PerformanceChart points={data?.chartPoints ?? []} benchmark={data?.benchmark ?? null} loading={loading} />
            {/* Chart legend */}
            {!loading && (
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-indigo-500" />
                  <span className="text-xs text-muted-foreground">Portfolio (indexed to 100)</span>
                </div>
                {data?.benchmark && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-px w-4 border-t-2 border-dashed border-amber-500" />
                    <span className="text-xs text-muted-foreground">SPY (indexed to 100)</span>
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

          {/* Return metrics */}
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

          {/* Risk metrics */}
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

          {/* Position breakdown */}
          {data && <PositionsTable positions={data.positions} currency={currency} />}

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
