import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { chart, seriesColor, recharts } from '@/lib/chart-theme'
import { cn } from '@/lib/utils'

export interface RadarDataPoint {
  axis: string
  [seriesKey: string]: string | number
}

export interface RadarSeries {
  dataKey: string
  name: string
  color?: string
  fillOpacity?: number
}

interface RadarChartProps {
  data: RadarDataPoint[]
  series: RadarSeries[]
  height?: number
  domain?: [number, number]
  className?: string
}

export function RadarChartComponent({
  data,
  series,
  height = 300,
  domain = [0, 100],
  className,
}: RadarChartProps) {
  return (
    <div className={cn(className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={chart.grid} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 11, fill: chart.muted }}
          />
          <PolarRadiusAxis
            domain={domain}
            tick={{ fontSize: 10, fill: chart.muted }}
            axisLine={false}
          />
          {series.map((s, i) => (
            <Radar
              key={s.dataKey}
              name={s.name}
              dataKey={s.dataKey}
              stroke={s.color ?? seriesColor(i)}
              fill={s.color ?? seriesColor(i)}
              fillOpacity={s.fillOpacity ?? 0.15}
              strokeWidth={2}
            />
          ))}
          <Tooltip
            contentStyle={recharts.tooltip.contentStyle}
            labelStyle={recharts.tooltip.labelStyle}
            itemStyle={recharts.tooltip.itemStyle}
          />
          {series.length > 1 && (
            <Legend wrapperStyle={recharts.legend.wrapperStyle} />
          )}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}
