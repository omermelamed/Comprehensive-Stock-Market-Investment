import { useState, useCallback, useMemo, useEffect } from 'react'
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
  /** Optional: recomputes the donut center text from the active-data total and count. */
  formatCenterValue?: (activeTotal: number, activeCount: number) => string
}

interface TimeSeriesProps extends BaseProps {
  data?: never
  timeSeries: TimeSeriesConfig
  formatValue?: never
  centerLabel?: never
  centerValue?: never
  formatCenterValue?: never
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
  try { return localStorage.getItem(STORAGE_PREFIX + chartId) as ChartType | null }
  catch { return null }
}

function writePref(chartId: string, type: ChartType) {
  try { localStorage.setItem(STORAGE_PREFIX + chartId, type) }
  catch { /* quota */ }
}

/* ── shared legend row ───────────────────────────────────── */

interface LegendItem {
  name: string
  color: string
  label?: string | null
}

function LegendRow({
  items, activeKeys, onToggle,
}: {
  items: LegendItem[]
  activeKeys: Set<string>
  onToggle: (name: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
      {items.map(({ name, color, label }) => {
        const isActive = activeKeys.has(name)
        return (
          <button
            key={name}
            onClick={() => onToggle(name)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium',
              'cursor-pointer select-none transition-all duration-200 hover:bg-muted/60',
              !isActive && 'opacity-40',
            )}
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full transition-colors duration-200"
              style={{ backgroundColor: color }}
            />
            <span
              className={cn(
                'transition-all duration-200 text-muted-foreground',
                !isActive && 'line-through decoration-muted-foreground',
              )}
            >
              {name}
            </span>
            {label != null && (
              <span
                className={cn(
                  'tabular-nums font-mono font-medium transition-colors duration-200',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
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

  // ── Toggle state (survives chart-type switches) ───────────
  const allNames = useMemo((): string[] => {
    if (isTimeSeries) return props.timeSeries!.series.map(s => s.name)
    return (props.data ?? []).map(d => d.name)
  }, [isTimeSeries, props.timeSeries, props.data])

  const [activeKeys, setActiveKeys] = useState<Set<string>>(() => new Set(allNames))

  // When the available names change (data reload / prop update), preserve existing
  // deselections for names that still exist; add new names as active.
  const namesFingerprint = allNames.join('\0')
  useEffect(() => {
    setActiveKeys(prev => {
      const result = new Set<string>()
      for (const n of allNames) {
        // Include if: first render (prev empty) OR was previously active
        if (prev.size === 0 || prev.has(n)) result.add(n)
      }
      // Guarantee at least one active
      if (result.size === 0 && allNames.length > 0) result.add(allNames[0])
      return result
    })
  }, [namesFingerprint]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback((name: string) => {
    setActiveKeys(prev => {
      if (prev.has(name)) {
        if (prev.size <= 1) return prev  // keep at least one active
        const next = new Set(prev)
        next.delete(name)
        return next
      }
      return new Set([...prev, name])
    })
  }, [])

  return (
    <div className={cn(className)}>
      {/* Type switcher */}
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

      {isTimeSeries ? (
        <TimeSeriesRender
          type={activeType}
          ts={props.timeSeries!}
          height={height}
          activeKeys={activeKeys}
          onToggle={toggle}
        />
      ) : (
        <CategoryRender
          type={activeType}
          data={props.data!}
          height={height}
          formatValue={props.formatValue ?? ((v) => `${v.toFixed(1)}%`)}
          centerLabel={props.centerLabel}
          centerValue={props.centerValue}
          formatCenterValue={props.formatCenterValue}
          activeKeys={activeKeys}
          onToggle={toggle}
        />
      )}
    </div>
  )
}

/* ── category renderer ───────────────────────────────────── */

function CategoryRender({
  type, data, height, formatValue, centerLabel, centerValue, formatCenterValue, activeKeys, onToggle,
}: {
  type: ChartType
  data: ChartDataPoint[]
  height: number
  formatValue: (v: number) => string
  centerLabel?: string
  centerValue?: string
  formatCenterValue?: (activeTotal: number, activeCount: number) => string
  activeKeys: Set<string>
  onToggle: (name: string) => void
}) {
  // Stamp each data point with a stable color based on its position in the
  // full (unfiltered) array so toggling items off never shifts colors.
  const coloredData = useMemo(
    () => data.map((d, i) => ({ ...d, color: d.color ?? seriesColor(i) })),
    [data],
  )

  const activeData = useMemo(
    () => coloredData.filter(d => activeKeys.has(d.name)),
    [coloredData, activeKeys],
  )
  const activeTotal = useMemo(
    () => activeData.reduce((s, d) => s + d.value, 0),
    [activeData],
  )

  const computedCenterValue = formatCenterValue
    ? formatCenterValue(activeTotal, activeData.length)
    : centerValue

  const cartesian = useMemo(
    () => activeData.map(d => ({ name: d.name, value: d.value, color: d.color })),
    [activeData],
  )
  const singleSeries = useMemo(() => [{ dataKey: 'value', name: 'Value' }], [])
  const radarData = useMemo(
    () => activeData.map(d => ({ axis: d.name, value: d.value })),
    [activeData],
  )
  const radarDomain = useMemo<[number, number]>(
    () => [0, Math.max(...activeData.map(d => d.value), 100)],
    [activeData],
  )

  const legendItems: LegendItem[] = useMemo(
    () => coloredData.map((entry) => ({
      name: entry.name,
      color: entry.color,
      label: formatValue(entry.value),
    })),
    [coloredData, formatValue],
  )

  return (
    <>
      {type === 'donut' && (
        <DonutChart
          data={activeData} height={height} formatValue={formatValue}
          centerLabel={centerLabel} centerValue={computedCenterValue}
          showLegend={false}
        />
      )}
      {type === 'bar' && (
        <HBarChart data={activeData} height={height} formatValue={formatValue} />
      )}
      {type === 'line' && (
        <LineChartComponent
          data={cartesian} series={singleSeries} xDataKey="name"
          height={height} yTickFormatter={formatValue} showLegend={false}
        />
      )}
      {type === 'area' && (
        <AreaChartComponent
          data={cartesian} series={singleSeries} xDataKey="name"
          height={height} yTickFormatter={formatValue} showLegend={false}
        />
      )}
      {type === 'radar' && (
        <RadarChartComponent
          data={radarData} series={[{ dataKey: 'value', name: 'Value' }]}
          height={height} domain={radarDomain}
        />
      )}

      <LegendRow items={legendItems} activeKeys={activeKeys} onToggle={onToggle} />
    </>
  )
}

/* ── time-series renderer ────────────────────────────────── */

function TimeSeriesRender({
  type, ts, height, activeKeys, onToggle,
}: {
  type: ChartType
  ts: TimeSeriesConfig
  height: number
  activeKeys: Set<string>
  onToggle: (name: string) => void
}) {
  // Stamp each series with a stable color based on its original index
  // so toggling series off never shifts colors.
  const coloredSeries = useMemo(
    () => ts.series.map((s, i) => ({ ...s, color: s.color ?? seriesColor(i) })),
    [ts.series],
  )

  const activeTsSeries = useMemo(
    () => coloredSeries.filter(s => activeKeys.has(s.name)),
    [coloredSeries, activeKeys],
  )

  const lineSeries: LineSeries[] = useMemo(
    () => activeTsSeries.map(s => ({
      dataKey: s.dataKey,
      name: s.name,
      color: s.color,
      strokeWidth: s.strokeWidth,
      strokeDasharray: s.strokeDasharray,
    })),
    [activeTsSeries],
  )

  const areaSeries: AreaSeries[] = useMemo(
    () => activeTsSeries.map(s => ({
      dataKey: s.dataKey,
      name: s.name,
      color: s.color,
      strokeDasharray: s.strokeDasharray,
    })),
    [activeTsSeries],
  )

  // Bar / donut / radar use the first active series only
  const firstActive = activeTsSeries[0]
  const barData = useMemo(() => {
    if (!firstActive) return []
    return ts.data.map((d, i) => ({
      name: String(d[ts.xDataKey] ?? i),
      value: Number(d[firstActive.dataKey] ?? 0),
    }))
  }, [ts, firstActive])

  const donutData = useMemo(() => {
    if (!firstActive) return []
    return ts.data.map((d, i) => ({
      name: String(d[ts.xDataKey] ?? i),
      value: Math.abs(Number(d[firstActive.dataKey] ?? 0)),
    }))
  }, [ts, firstActive])

  const showLegend = (ts.showLegend ?? ts.series.length > 1) && ts.series.length > 1

  const legendItems: LegendItem[] = useMemo(
    () => coloredSeries.map((s) => ({
      name: s.name,
      color: s.color,
      label: null,
    })),
    [coloredSeries],
  )

  return (
    <>
      {type === 'line' && (
        <LineChartComponent
          data={ts.data} series={lineSeries} xDataKey={ts.xDataKey}
          height={height} xTickFormatter={ts.xTickFormatter}
          yTickFormatter={ts.yTickFormatter} yDomain={ts.yDomain}
          showLegend={false}
        />
      )}
      {type === 'area' && (
        <AreaChartComponent
          data={ts.data} series={areaSeries} xDataKey={ts.xDataKey}
          height={height} xTickFormatter={ts.xTickFormatter}
          yTickFormatter={ts.yTickFormatter} yDomain={ts.yDomain}
          showLegend={false}
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
          showLegend={false}
        />
      )}
      {type === 'radar' && firstActive && (
        <RadarChartComponent
          data={barData.map(d => ({ axis: d.name, value: d.value }))}
          series={[{ dataKey: 'value', name: firstActive.name }]}
          height={height}
        />
      )}

      {showLegend && (
        <LegendRow items={legendItems} activeKeys={activeKeys} onToggle={onToggle} />
      )}
    </>
  )
}
