import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { seriesColor, recharts } from '@/lib/chart-theme'
import { cn } from '@/lib/utils'

export interface AreaSeries {
  dataKey: string
  name: string
  color?: string
  fillOpacity?: number
  type?: 'monotone' | 'linear' | 'step'
  strokeDasharray?: string
}

interface AreaChartProps {
  data: Record<string, unknown>[]
  series: AreaSeries[]
  xDataKey: string
  height?: number
  xTickFormatter?: (value: string) => string
  yTickFormatter?: (value: number) => string
  yDomain?: [number | string, number | string]
  showLegend?: boolean
  className?: string
}

export function AreaChartComponent({
  data,
  series,
  xDataKey,
  height = 280,
  xTickFormatter,
  yTickFormatter,
  yDomain,
  showLegend = true,
  className,
}: AreaChartProps) {
  return (
    <div className={cn(className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data}>
          <defs>
            {series.map((s, i) => {
              const c = s.color ?? seriesColor(i)
              return (
                <linearGradient key={s.dataKey} id={`area-grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={s.fillOpacity ?? 0.25} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              )
            })}
          </defs>
          <CartesianGrid {...recharts.grid} />
          <XAxis
            dataKey={xDataKey}
            tick={recharts.xAxis.tick}
            stroke={recharts.xAxis.stroke}
            tickFormatter={xTickFormatter}
            minTickGap={40}
          />
          <YAxis
            tick={recharts.yAxis.tick}
            stroke={recharts.yAxis.stroke}
            tickFormatter={yTickFormatter}
            domain={yDomain ?? ['auto', 'auto']}
          />
          <Tooltip
            contentStyle={recharts.tooltip.contentStyle}
            labelStyle={recharts.tooltip.labelStyle}
            itemStyle={recharts.tooltip.itemStyle}
          />
          {showLegend && series.length > 1 && (
            <Legend wrapperStyle={recharts.legend.wrapperStyle} />
          )}
          {series.map((s, i) => {
            const c = s.color ?? seriesColor(i)
            return (
              <Area
                key={s.dataKey}
                type={s.type ?? 'monotone'}
                dataKey={s.dataKey}
                name={s.name}
                stroke={c}
                fill={`url(#area-grad-${s.dataKey})`}
                strokeWidth={2}
                strokeDasharray={s.strokeDasharray}
                dot={false}
              />
            )
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
