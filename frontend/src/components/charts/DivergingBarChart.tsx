import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { recharts, chart } from '@/lib/chart-theme'
import { cn } from '@/lib/utils'

export interface DivergingBarEntry {
  name: string
  value: number
}

interface DivergingBarChartProps {
  data: DivergingBarEntry[]
  height?: number
  formatValue?: (value: number) => string
  positiveColor?: string
  negativeColor?: string
  thresholdColor?: string
  threshold?: number
  className?: string
}

export function DivergingBarChart({
  data,
  height,
  formatValue = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
  positiveColor = '#f59e0b',
  negativeColor = '#3b82f6',
  thresholdColor = '#dc2626',
  threshold = 5,
  className,
}: DivergingBarChartProps) {
  const longestLabel = data.reduce((max, d) => Math.max(max, d.name.length), 0)
  const yAxisWidth = Math.max(56, Math.min(longestLabel * 8 + 12, 120))
  const computedHeight = height ?? Math.max(200, data.length * 44 + 40)

  const getColor = (value: number) => {
    if (Math.abs(value) > threshold) return thresholdColor
    return value >= 0 ? positiveColor : negativeColor
  }

  return (
    <div className={cn(className)}>
      <ResponsiveContainer width="100%" height={computedHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid horizontal={false} {...recharts.grid} />
          <XAxis
            type="number"
            tick={recharts.xAxis.tick}
            tickFormatter={formatValue}
            axisLine={{ stroke: chart.grid }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={yAxisWidth}
            tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--color-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={recharts.tooltip.cursor}
            contentStyle={recharts.tooltip.contentStyle}
            labelStyle={recharts.tooltip.labelStyle}
            formatter={(value: number) => [formatValue(value), 'Drift']}
          />
          <ReferenceLine x={0} stroke="var(--color-border)" strokeWidth={1.5} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={getColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: negativeColor }} />
          <span>Underweight</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: positiveColor }} />
          <span>Overweight</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: thresholdColor }} />
          <span>{'>'}{threshold}% drift</span>
        </div>
      </div>
    </div>
  )
}
