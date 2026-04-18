import { useState, useCallback, useMemo } from 'react'
import {
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DonutChart } from './DonutChart'
import { HBarChart } from './HBarChart'
import { LineChartComponent, type LineSeries } from './LineChart'
import { AreaChartComponent, type AreaSeries } from './AreaChart'
import { RadarChartComponent } from './RadarChart'
import { seriesColor } from '@/lib/chart-theme'

/* ── types ───────────────────────────────────────────────── */

export type ChartType = 'donut' | 'bar' | 'line' | 'area' | 'radar'

export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

export interface TimeSeriesConfig {
  data: Record<string, unknown>[]
  xDataKey: string
  series: Array<{
    dataKey: string
    name: string
    color?: string
    strokeWidth?: number
    strokeDasharray?: string
  }>
  xTickFormatter?: (value: string) => string
  yTickFormatter?: (value: number) => string
  yDomain?: [number | string, number | string]
  showLegend?: boolean
}

interface BaseProps {
  chartId: string
  allowedTypes?: ChartType[]
  defaultType?: ChartType
  height?: number
  className?: string
}

interface CategoryProps extends BaseProps {
  data: ChartDataPoint[]
  timeSeries?: never
  formatValue?: (value: number) => string
  centerLabel?: string
  centerValue?: string
}

interface TimeSeriesProps extends BaseProps {
  data?: never
  timeSeries: TimeSeriesConfig
  formatValue?: never
  centerLabel?: never
  centerValue?: never
}

type UniversalChartProps = CategoryProps | TimeSeriesProps

/* ── constants ───────────────────────────────────────────── */

const STORAGE_PREFIX = 'chart-pref-'

const CHART_ICONS: Record<ChartType, typeof PieIcon> = {
  donut: PieIcon,
  bar: BarChart3,
  line: LineIcon,
  area: AreaIcon,
  radar: Activity,
}

const CHART_LABELS: Record<ChartType, string> = {
  donut: 'Donut',
  bar: 'Bar',
  line: 'Line',
  area: 'Area',
  radar: 'Radar',
}

/* ── persistence ─────────────────────────────────────────── */

function readPref(chartId: string): ChartType | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + chartId) as ChartType | null
  } catch {
    return null
  }
}

function writePref(chartId: string, type: ChartType) {
  try {
    localStorage.setItem(STORAGE_PREFIX + chartId, type)
  } catch { /* quota */ }
}

/* ── component ───────────────────────────────────────────── */

export function UniversalChart(props: UniversalChartProps) {
  const {
    chartId,
    allowedTypes = props.timeSeries ? ['line', 'area', 'bar'] : ['donut', 'bar', 'line', 'area'],
    defaultType = props.timeSeries ? 'line' : 'donut',
    height = 260,
    className,
  } = props

  const [chartType, setChartType] = useState<ChartType>(
    () => readPref(chartId) ?? defaultType,
  )

  const handleTypeChange = useCallback(
    (type: ChartType) => { setChartType(type); writePref(chartId, type) },
    [chartId],
  )

  const activeType = allowedTypes.includes(chartType) ? chartType : defaultType

  const isTimeSeries = !!props.timeSeries

  return (
    <div className={cn(className)}>
      {/* Toggle row */}
      {allowedTypes.length > 1 && (
        <div className="mb-3 flex items-center justify-end gap-0.5">
          {allowedTypes.map((type) => {
            const Icon = CHART_ICONS[type]
            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                title={CHART_LABELS[type]}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  type === activeType
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            )
          })}
        </div>
      )}

      {/* Render */}
      {isTimeSeries ? (
        <TimeSeriesRender type={activeType} ts={props.timeSeries!} height={height} />
      ) : (
        <CategoryRender
          type={activeType}
          data={props.data!}
          height={height}
          formatValue={props.formatValue ?? ((v) => `${v.toFixed(1)}%`)}
          centerLabel={props.centerLabel}
          centerValue={props.centerValue}
        />
      )}
    </div>
  )
}

/* ── category renderer ───────────────────────────────────── */

function CategoryRender({
  type, data, height, formatValue, centerLabel, centerValue,
}: {
  type: ChartType
  data: ChartDataPoint[]
  height: number
  formatValue: (v: number) => string
  centerLabel?: string
  centerValue?: string
}) {
  const cartesian = useMemo(() => data.map(d => ({ name: d.name, value: d.value })), [data])
  const series = useMemo(() => [{ dataKey: 'value', name: 'Value' }], [])
  const radarData = useMemo(() => data.map(d => ({ axis: d.name, value: d.value })), [data])

  return (
    <>
      {type === 'donut' && (
        <DonutChart
          data={data} height={height} formatValue={formatValue}
          centerLabel={centerLabel} centerValue={centerValue}
        />
      )}
      {type === 'bar' && (
        <HBarChart data={data} height={height} formatValue={formatValue} />
      )}
      {type === 'line' && (
        <LineChartComponent
          data={cartesian} series={series} xDataKey="name"
          height={height} yTickFormatter={formatValue} showLegend={false}
        />
      )}
      {type === 'area' && (
        <AreaChartComponent
          data={cartesian} series={series} xDataKey="name"
          height={height} yTickFormatter={formatValue} showLegend={false}
        />
      )}
      {type === 'radar' && (
        <RadarChartComponent
          data={radarData} series={[{ dataKey: 'value', name: 'Value' }]}
          height={height} domain={[0, Math.max(...data.map(d => d.value), 100)]}
        />
      )}

      {/* Legend for non-donut (donut draws its own) */}
      {type !== 'donut' && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {data.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color ?? seriesColor(i) }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="tabular-nums font-mono font-medium text-foreground">
                {formatValue(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/* ── time-series renderer ────────────────────────────────── */

function TimeSeriesRender({
  type, ts, height,
}: {
  type: ChartType
  ts: TimeSeriesConfig
  height: number
}) {
  const lineSeries: LineSeries[] = useMemo(
    () => ts.series.map(s => ({
      dataKey: s.dataKey,
      name: s.name,
      color: s.color,
      strokeWidth: s.strokeWidth,
      strokeDasharray: s.strokeDasharray,
    })),
    [ts.series],
  )

  const areaSeries: AreaSeries[] = useMemo(
    () => ts.series.map(s => ({
      dataKey: s.dataKey,
      name: s.name,
      color: s.color,
      strokeDasharray: s.strokeDasharray,
    })),
    [ts.series],
  )

  const barData = useMemo(() => {
    if (ts.series.length !== 1) return []
    const key = ts.series[0].dataKey
    return ts.data.map((d, i) => ({
      name: String(d[ts.xDataKey] ?? i),
      value: Number(d[key] ?? 0),
    }))
  }, [ts])

  const donutData = useMemo(() => {
    if (ts.series.length !== 1) return []
    const key = ts.series[0].dataKey
    return ts.data.map((d, i) => ({
      name: String(d[ts.xDataKey] ?? i),
      value: Math.abs(Number(d[key] ?? 0)),
    }))
  }, [ts])

  const showLegend = ts.showLegend ?? ts.series.length > 1

  return (
    <>
      {type === 'line' && (
        <LineChartComponent
          data={ts.data} series={lineSeries} xDataKey={ts.xDataKey}
          height={height} xTickFormatter={ts.xTickFormatter}
          yTickFormatter={ts.yTickFormatter} yDomain={ts.yDomain}
          showLegend={showLegend}
        />
      )}
      {type === 'area' && (
        <AreaChartComponent
          data={ts.data} series={areaSeries} xDataKey={ts.xDataKey}
          height={height} xTickFormatter={ts.xTickFormatter}
          yTickFormatter={ts.yTickFormatter} yDomain={ts.yDomain}
          showLegend={showLegend}
        />
      )}
      {type === 'bar' && (
        <HBarChart
          data={barData} height={height}
          formatValue={ts.yTickFormatter ?? ((v) => `${v}`)}
        />
      )}
      {type === 'donut' && (
        <DonutChart
          data={donutData} height={height}
          formatValue={ts.yTickFormatter ?? ((v) => `${v}`)}
        />
      )}
      {type === 'radar' && ts.series.length === 1 && (
        <RadarChartComponent
          data={barData.map(d => ({ axis: d.name, value: d.value }))}
          series={[{ dataKey: 'value', name: ts.series[0].name }]}
          height={height}
        />
      )}
    </>
  )
}
