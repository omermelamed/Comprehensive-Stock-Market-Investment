import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Info, CandlestickChart as CandlestickIcon, LineChart as LineIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getHoldingsHistory, getOhlcData, type SymbolHistorySeries, type OhlcBar } from '@/api/portfolio'
import { formatMoney } from '@/lib/currency'
import { seriesColor, pnlClass } from '@/lib/chart-theme'
import { cn } from '@/lib/utils'
import { UniversalChart } from '@/components/charts'
import { CandlestickChart } from '@/components/charts'

type ViewMode = 'line' | 'candlestick'

const TIMEFRAMES = ['1W', '1M', '3M', '6M', '1Y', '2Y', '5Y', 'ALL'] as const
type Timeframe = typeof TIMEFRAMES[number]

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '5Y': 1825, 'ALL': 0,
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function DateRangePicker({
  from, to, minDate, maxDate, onApply,
}: {
  from: string; to: string; minDate: string; maxDate: string
  onApply: (from: string, to: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [localFrom, setLocalFrom] = useState(from)
  const [localTo, setLocalTo] = useState(to)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalFrom(from); setLocalTo(to) }, [from, to])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const label = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${fmt(new Date(localFrom + 'T00:00'))} – ${fmt(new Date(localTo + 'T00:00'))}`
  }, [localFrom, localTo])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">From</label>
              <input type="date" value={localFrom} min={minDate} max={localTo}
                onChange={e => setLocalFrom(e.target.value)}
                className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <span className="mt-4 text-muted-foreground">→</span>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">To</label>
              <input type="date" value={localTo} min={localFrom} max={maxDate}
                onChange={e => setLocalTo(e.target.value)}
                className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <button onClick={() => { onApply(localFrom, localTo); setOpen(false) }}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

export function HoldingsHistoryChart() {
  const [viewMode, setViewMode] = useState<ViewMode>('line')
  const [allSeries, setAllSeries] = useState<SymbolHistorySeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<Timeframe>('3M')
  const [visibleFrom, setVisibleFrom] = useState(() => daysAgo(90))
  const [visibleTo, setVisibleTo] = useState(todayStr)

  // Line mode: multi-select — set of visible symbols
  const [visibleSymbols, setVisibleSymbols] = useState<Set<string>>(new Set())

  // Candlestick mode: single-select
  const [candlestickSymbol, setCandlestickSymbol] = useState<string | null>(null)

  // OHLC cache: symbol → bars (fetched once per symbol, ALL range)
  const [ohlcCache, setOhlcCache] = useState<Map<string, OhlcBar[]>>(new Map())
  const [ohlcCurrencyMap, setOhlcCurrencyMap] = useState<Map<string, string>>(new Map())
  const [ohlcLoading, setOhlcLoading] = useState(false)

  // Track which symbols are currently being fetched to avoid duplicates
  const fetchingRef = useRef<Set<string>>(new Set())

  // Fetch holdings list
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getHoldingsHistory('ALL')
      .then(data => {
        if (!cancelled) {
          setAllSeries(data.series)
          if (data.series.length > 0) {
            const symbols = data.series.map(s => s.symbol)
            setVisibleSymbols(new Set(symbols))
            setCandlestickSymbol(symbols[0])
          }
        }
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Fetch OHLC data for symbols that aren't cached yet
  const fetchOhlcForSymbols = useCallback((symbols: string[]) => {
    const needed = symbols.filter(s => !ohlcCache.has(s) && !fetchingRef.current.has(s))
    if (needed.length === 0) return

    needed.forEach(s => fetchingRef.current.add(s))
    setOhlcLoading(true)

    Promise.all(needed.map(s =>
      getOhlcData(s, 'ALL')
        .then(res => ({ symbol: s, bars: res.bars, currency: res.currency }))
        .catch(() => ({ symbol: s, bars: [] as OhlcBar[], currency: 'USD' }))
    )).then(results => {
      setOhlcCache(prev => {
        const next = new Map(prev)
        for (const r of results) next.set(r.symbol, r.bars)
        return next
      })
      setOhlcCurrencyMap(prev => {
        const next = new Map(prev)
        for (const r of results) next.set(r.symbol, r.currency)
        return next
      })
      needed.forEach(s => fetchingRef.current.delete(s))
      setOhlcLoading(false)
    })
  }, [ohlcCache])

  // Trigger OHLC fetch when visible symbols change (line mode) or candlestick symbol changes
  useEffect(() => {
    if (viewMode === 'line') {
      fetchOhlcForSymbols(Array.from(visibleSymbols))
    } else if (candlestickSymbol) {
      fetchOhlcForSymbols([candlestickSymbol])
    }
  }, [viewMode, visibleSymbols, candlestickSymbol, fetchOhlcForSymbols])

  const colorBySymbol = useMemo(
    () => new Map(allSeries.map((s, i) => [s.symbol, seriesColor(i)])),
    [allSeries],
  )

  // Date bounds from all cached OHLC data
  const { ohlcMinDate, ohlcMaxDate } = useMemo(() => {
    let min = '9999-12-31'
    let max = '0000-01-01'
    for (const bars of ohlcCache.values()) {
      if (bars.length > 0) {
        if (bars[0].date < min) min = bars[0].date
        if (bars[bars.length - 1].date > max) max = bars[bars.length - 1].date
      }
    }
    return {
      ohlcMinDate: min === '9999-12-31' ? daysAgo(365 * 5) : min,
      ohlcMaxDate: max === '0000-01-01' ? todayStr() : max,
    }
  }, [ohlcCache])

  // Determine the primary display currency (from first visible symbol)
  const displayCurrency = useMemo(() => {
    for (const s of visibleSymbols) {
      const c = ohlcCurrencyMap.get(s)
      if (c) return c
    }
    return ohlcCurrencyMap.get(candlestickSymbol ?? '') ?? 'USD'
  }, [visibleSymbols, candlestickSymbol, ohlcCurrencyMap])

  // Line mode: merge all visible symbols' close prices into a single dataset
  const { lineChartData, lineChartSeries } = useMemo(() => {
    const activeSymbols = Array.from(visibleSymbols).filter(s => ohlcCache.has(s))
    if (activeSymbols.length === 0) return { lineChartData: [], lineChartSeries: [] }

    const dateMap = new Map<string, Record<string, unknown>>()
    for (const sym of activeSymbols) {
      const bars = ohlcCache.get(sym) ?? []
      for (const b of bars) {
        if (b.date < visibleFrom || b.date > visibleTo) continue
        let row = dateMap.get(b.date)
        if (!row) { row = { date: b.date }; dateMap.set(b.date, row) }
        row[sym] = b.close
      }
    }

    const data = Array.from(dateMap.values()).sort(
      (a, b) => String(a.date).localeCompare(String(b.date)),
    )

    const series = activeSymbols.map(sym => ({
      dataKey: sym,
      name: allSeries.find(s => s.symbol === sym)?.label ?? sym,
      color: colorBySymbol.get(sym),
      strokeWidth: 2,
    }))

    return { lineChartData: data, lineChartSeries: series }
  }, [visibleSymbols, ohlcCache, visibleFrom, visibleTo, allSeries, colorBySymbol])

  // Candlestick mode: single symbol, filtered
  const candlestickBars = useMemo(() => {
    if (!candlestickSymbol) return []
    const bars = ohlcCache.get(candlestickSymbol) ?? []
    return bars.filter(b => b.date >= visibleFrom && b.date <= visibleTo)
  }, [candlestickSymbol, ohlcCache, visibleFrom, visibleTo])

  const handlePreset = useCallback((tf: Timeframe) => {
    setActivePreset(tf)
    if (tf === 'ALL') {
      setVisibleFrom(ohlcMinDate)
      setVisibleTo(ohlcMaxDate)
    } else {
      setVisibleFrom(daysAgo(TIMEFRAME_DAYS[tf]))
      setVisibleTo(todayStr())
    }
  }, [ohlcMinDate, ohlcMaxDate])

  const handleCustomRange = useCallback((from: string, to: string) => {
    setActivePreset('ALL')
    setVisibleFrom(from)
    setVisibleTo(to)
  }, [])

  const toggleSymbol = useCallback((symbol: string) => {
    setVisibleSymbols(prev => {
      const next = new Set(prev)
      if (next.has(symbol)) {
        if (next.size > 1) next.delete(symbol) // keep at least one
      } else {
        next.add(symbol)
      }
      return next
    })
  }, [])

  const allDataLoaded = !loading && !error && allSeries.length > 0
  const isStillFetching = ohlcLoading && ohlcCache.size === 0

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-foreground">Holdings Performance</h2>
              <div className="group relative flex items-center">
                <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
                <div className="pointer-events-none absolute left-5 top-0 z-50 w-64 rounded-xl border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="font-semibold mb-1">How to read this chart</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {viewMode === 'line'
                      ? 'Daily closing prices. Click symbols below to show/hide.'
                      : 'OHLC candlestick chart with daily open, high, low, close and volume.'}
                  </p>
                </div>
              </div>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                onClick={() => setViewMode('line')}
                title="Price line (multi-symbol)"
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'line'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <LineIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('candlestick')}
                title="Candlestick (OHLC)"
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'candlestick'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <CandlestickIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Candlestick: single symbol selector */}
            {viewMode === 'candlestick' && allSeries.length > 0 && (
              <select
                value={candlestickSymbol ?? ''}
                onChange={e => setCandlestickSymbol(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              >
                {allSeries.map(s => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol}{s.label ? ` — ${s.label}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
              {TIMEFRAMES.map(tf => (
                <button key={tf} onClick={() => handlePreset(tf)}
                  className={[
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    activePreset === tf ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}>
                  {tf}
                </button>
              ))}
            </div>
            {allDataLoaded && ohlcCache.size > 0 && (
              <DateRangePicker from={visibleFrom} to={visibleTo}
                minDate={ohlcMinDate} maxDate={ohlcMaxDate} onApply={handleCustomRange} />
            )}
          </div>
        </div>

        {/* Chart area */}
        {error ? (
          <div className="flex h-[340px] items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : loading || isStillFetching ? (
          <div className="h-[340px] animate-pulse rounded-xl bg-muted" />
        ) : allSeries.length === 0 ? (
          <div className="flex h-[340px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No holdings data available.</p>
          </div>
        ) : viewMode === 'candlestick' ? (
          candlestickBars.length > 0 ? (
            <CandlestickChart
              data={candlestickBars}
              height={340}
              priceFormatter={v => formatMoney(v, ohlcCurrencyMap.get(candlestickSymbol ?? '') ?? 'USD')}
            />
          ) : (
            <div className="flex h-[340px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {ohlcLoading ? 'Loading…' : `No data for ${candlestickSymbol} in the selected range.`}
              </p>
            </div>
          )
        ) : lineChartData.length > 0 ? (
          <UniversalChart
            chartId="dashboard-holdings-performance"
            timeSeries={{
              data: lineChartData,
              xDataKey: 'date',
              series: lineChartSeries,
              xTickFormatter: d => d.slice(5),
              yTickFormatter: v => formatMoney(v, displayCurrency),
              showLegend: false,
            }}
            defaultType="line"
            allowedTypes={['line', 'area']}
            height={340}
          />
        ) : (
          <div className="flex h-[340px] items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {ohlcLoading ? 'Loading…' : 'No data in the selected range.'}
            </p>
          </div>
        )}

        {/* Legend */}
        {allDataLoaded && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {allSeries.map(s => {
              const pct = s.periodReturnPct
              const isVisible = viewMode === 'line'
                ? visibleSymbols.has(s.symbol)
                : s.symbol === candlestickSymbol

              return (
                <button
                  key={s.symbol}
                  onClick={() => {
                    if (viewMode === 'line') {
                      toggleSymbol(s.symbol)
                    } else {
                      setCandlestickSymbol(s.symbol)
                    }
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all border',
                    isVisible
                      ? 'border-primary bg-primary/5 opacity-100'
                      : 'border-border hover:bg-muted/50 opacity-40',
                  )}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colorBySymbol.get(s.symbol) }}
                  />
                  <span className="font-semibold">{s.symbol}</span>
                  {s.label && <span className="text-muted-foreground">{s.label}</span>}
                  <span className={`tabular-nums font-mono ${pnlClass(pct)}`}>
                    {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
