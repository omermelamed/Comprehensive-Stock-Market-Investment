import { useEffect, useRef } from 'react'
import { createChart, ColorType, type IChartApi, type ISeriesApi, type LineData } from 'lightweight-charts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { PortfolioHistory } from '@/api/portfolio'

const TIMEFRAMES = ['1W', '1M', '3M', '6M', '1Y', 'ALL'] as const

interface Props {
  history: PortfolioHistory | null
  historyRange: string
  onRangeChange: (range: string) => void
  loading?: boolean
}

/** Resolve a CSS variable to an rgb() string that lightweight-charts can parse. */
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

export function PortfolioHistoryChart({ history, historyRange, onRangeChange, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  // Create chart on mount, destroy on unmount
  useEffect(() => {
    if (!containerRef.current) return

    const mutedFg = resolveColor('--color-muted-foreground', '#64748b')
    const border = resolveColor('--color-border', '#e2e8f0')

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 220,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: mutedFg,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: border, style: 1 },
        horzLines: { color: border, style: 1 },
      },
      crosshair: {
        vertLine: { color: '#6366f1', width: 1, labelBackgroundColor: '#6366f1' },
        horzLine: { color: '#6366f1', width: 1, labelBackgroundColor: '#6366f1' },
      },
      timeScale: {
        borderColor: border,
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: border,
      },
      handleScroll: false,
      handleScale: false,
    })

    const series = chart.addLineSeries({
      color: '#6366f1',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    })

    chartRef.current = chart
    seriesRef.current = series

    // Resize observer
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width })
      }
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Update data when history changes
  useEffect(() => {
    if (!seriesRef.current || !history) return

    const data: LineData[] = history.points.map(p => ({
      time: p.date as LineData['time'],
      value: p.totalValue,
    }))

    seriesRef.current.setData(data)

    if (data.length > 0) {
      chartRef.current?.timeScale().fitContent()
    }
  }, [history])

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Portfolio History</h2>
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map(tf => (
              <Button
                key={tf}
                variant={historyRange === tf ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => onRangeChange(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>

        {/* Chart area */}
        {loading ? (
          <div className="h-[220px] animate-pulse rounded-xl bg-muted" />
        ) : (
          <div ref={containerRef} className="w-full" />
        )}
      </CardContent>
    </Card>
  )
}
