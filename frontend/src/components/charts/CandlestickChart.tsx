import { useMemo, useCallback } from 'react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Customized,
  type TooltipProps,
} from 'recharts'
import { recharts, chart as chartTheme } from '@/lib/chart-theme'
import { cn } from '@/lib/utils'

export interface OhlcDataPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface CandlestickChartProps {
  data: OhlcDataPoint[]
  height?: number
  priceFormatter?: (v: number) => string
  volumeFormatter?: (v: number) => string
  className?: string
}

const BULL_COLOR = '#22c55e'
const BEAR_COLOR = '#ef4444'
const BULL_VOLUME = 'rgba(34, 197, 94, 0.25)'
const BEAR_VOLUME = 'rgba(239, 68, 68, 0.25)'

/* ── Candlestick overlay rendered via Customized ─────────── */

interface CandlesLayerProps {
  formattedGraphicalItems?: Array<{
    props?: { data?: Array<{ x?: number; width?: number; payload?: OhlcDataPoint }> }
  }>
  yAxisMap?: Record<string, { scale?: (v: number) => number }>
}

function CandlesLayer({ formattedGraphicalItems, yAxisMap }: CandlesLayerProps) {
  const priceAxis = yAxisMap?.price
  if (!priceAxis?.scale) return null

  // Find the volume bar series to get x positions and widths
  const barSeries = formattedGraphicalItems?.[0]
  const barData = barSeries?.props?.data
  if (!barData || barData.length === 0) return null

  const scale = priceAxis.scale

  return (
    <g className="candlesticks-layer">
      {barData.map((bar, i) => {
        const { x = 0, width = 0, payload } = bar
        if (!payload) return null

        const { open, high, low, close } = payload
        const isBull = close >= open

        const yHigh = scale(high)
        const yLow = scale(low)
        const yOpen = scale(open)
        const yClose = scale(close)

        const bodyTop = Math.min(yOpen, yClose)
        const bodyHeight = Math.max(1, Math.abs(yOpen - yClose))
        const bodyWidth = Math.max(2, width * 0.65)
        const bodyX = x + (width - bodyWidth) / 2
        const wickX = x + width / 2
        const color = isBull ? BULL_COLOR : BEAR_COLOR

        return (
          <g key={i}>
            <line x1={wickX} y1={yHigh} x2={wickX} y2={yLow} stroke={color} strokeWidth={1} />
            <rect x={bodyX} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} rx={0.5} />
          </g>
        )
      })}
    </g>
  )
}

/* ── Tooltip ─────────────────────────────────────────────── */

function CandlestickTooltipContent({
  active,
  payload,
  priceFormatter,
  volumeFormatter,
}: TooltipProps<number, string> & {
  priceFormatter: (v: number) => string
  volumeFormatter: (v: number) => string
}) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload as OhlcDataPoint | undefined
  if (!d) return null

  const isBull = d.close >= d.open
  const change = d.close - d.open
  const changePct = d.open !== 0 ? (change / d.open) * 100 : 0

  return (
    <div
      className="rounded-xl border p-3 shadow-lg"
      style={{
        background: 'var(--color-card)',
        borderColor: chartTheme.gridBorder,
        fontSize: 12,
        minWidth: 180,
      }}
    >
      <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
        {d.date}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums font-mono text-xs">
        <span style={{ color: chartTheme.muted }}>Open</span>
        <span className="text-right" style={{ color: 'var(--color-foreground)' }}>{priceFormatter(d.open)}</span>
        <span style={{ color: chartTheme.muted }}>High</span>
        <span className="text-right" style={{ color: 'var(--color-foreground)' }}>{priceFormatter(d.high)}</span>
        <span style={{ color: chartTheme.muted }}>Low</span>
        <span className="text-right" style={{ color: 'var(--color-foreground)' }}>{priceFormatter(d.low)}</span>
        <span style={{ color: chartTheme.muted }}>Close</span>
        <span className="text-right" style={{ color: 'var(--color-foreground)' }}>{priceFormatter(d.close)}</span>
        <span style={{ color: chartTheme.muted }}>Volume</span>
        <span className="text-right" style={{ color: 'var(--color-foreground)' }}>{volumeFormatter(d.volume)}</span>
      </div>
      <div className="mt-2 border-t pt-1.5" style={{ borderColor: chartTheme.gridBorder }}>
        <span
          className="tabular-nums font-mono text-xs font-semibold"
          style={{ color: isBull ? BULL_COLOR : BEAR_COLOR }}
        >
          {change >= 0 ? '+' : ''}{priceFormatter(change)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
        </span>
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────── */

export function CandlestickChart({
  data,
  height = 340,
  priceFormatter = v => v.toFixed(2),
  volumeFormatter = v => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
    return String(v)
  },
  className,
}: CandlestickChartProps) {
  const { priceDomain, maxVolume } = useMemo(() => {
    if (data.length === 0) return { priceDomain: [0, 0] as [number, number], maxVolume: 0 }

    let minPrice = Infinity
    let maxPrice = -Infinity
    let maxVol = 0

    for (const d of data) {
      if (d.low < minPrice) minPrice = d.low
      if (d.high > maxPrice) maxPrice = d.high
      if (d.volume > maxVol) maxVol = d.volume
    }

    const priceRange = maxPrice - minPrice
    const padding = priceRange * 0.05

    return {
      priceDomain: [minPrice - padding, maxPrice + padding] as [number, number],
      maxVolume: maxVol,
    }
  }, [data])

  const xTickFormatter = useCallback((d: string) => {
    if (!d) return ''
    const parts = d.split('-')
    if (parts.length < 3) return d
    return `${parts[1]}/${parts[2]}`
  }, [])

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        <p className="text-sm text-muted-foreground">No candlestick data available.</p>
      </div>
    )
  }

  return (
    <div className={cn(className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...recharts.grid} />
          <XAxis
            dataKey="date"
            tick={recharts.xAxis.tick}
            stroke={recharts.xAxis.stroke}
            tickFormatter={xTickFormatter}
            minTickGap={50}
          />
          <YAxis
            yAxisId="price"
            domain={priceDomain}
            tick={recharts.yAxis.tick}
            stroke={recharts.yAxis.stroke}
            tickFormatter={priceFormatter}
            orientation="right"
          />
          <YAxis yAxisId="volume" hide domain={[0, maxVolume * 5]} />
          <Tooltip
            content={
              <CandlestickTooltipContent
                priceFormatter={priceFormatter}
                volumeFormatter={volumeFormatter}
              />
            }
            cursor={{ stroke: chartTheme.muted, strokeDasharray: '3 3', strokeWidth: 1 }}
          />

          {/* Volume bars (rendered first, so candles draw on top) */}
          <Bar dataKey="volume" yAxisId="volume" barSize={6} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.close >= d.open ? BULL_VOLUME : BEAR_VOLUME} />
            ))}
          </Bar>

          {/* Candlestick overlay — uses Customized to access yAxis scale directly */}
          <Customized
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component={CandlesLayer as any}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
