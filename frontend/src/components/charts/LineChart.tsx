import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { seriesColor, recharts } from '@/lib/chart-theme'
import { cn } from '@/lib/utils'

export interface LineSeries {
  dataKey: string
  name: string
  color?: string
  strokeWidth?: number
  strokeDasharray?: string
  dot?: boolean
}

interface LineChartProps {
  data: Record<string, unknown>[]
  series: LineSeries[]
  xDataKey: string
  height?: number
  xTickFormatter?: (value: string) => string
  yTickFormatter?: (value: number) => string
  yDomain?: [number | string, number | string]
  showLegend?: boolean
  className?: string
}

export function LineChartComponent({
  data,
  series,
  xDataKey,
  height = 280,
  xTickFormatter,
  yTickFormatter,
  yDomain,
  showLegend = true,
  className,
}: LineChartProps) {
  return (
    <div className={cn(className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 16, bottom: 0, left: 0 }}>
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
            width={60}
          />
          <Tooltip
            contentStyle={recharts.tooltip.contentStyle}
            labelStyle={recharts.tooltip.labelStyle}
            itemStyle={recharts.tooltip.itemStyle}
          />
          {showLegend && series.length > 1 && (
            <Legend
              wrapperStyle={recharts.legend.wrapperStyle}
              formatter={(value: string) => (
                <span style={{ color: 'var(--color-foreground)' }}>{value}</span>
              )}
            />
          )}
          {series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color ?? seriesColor(i)}
              strokeWidth={s.strokeWidth ?? 2}
              strokeDasharray={s.strokeDasharray}
              dot={s.dot ?? false}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
