import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { chart, seriesColor, recharts } from '@/lib/chart-theme'
import { cn } from '@/lib/utils'

export interface HBarEntry {
  name: string
  value: number
  color?: string
}

interface HBarChartProps {
  data: HBarEntry[]
  height?: number
  formatValue?: (value: number) => string
  formatTooltip?: (entry: HBarEntry) => string
  showLabels?: boolean
  barSize?: number
  className?: string
}

export function HBarChart({
  data,
  height,
  formatValue = (v) => `${v.toFixed(1)}%`,
  formatTooltip,
  showLabels = true,
  barSize = 28,
  className,
}: HBarChartProps) {
  const longestLabel = data.reduce((max, d) => Math.max(max, d.name.length), 0)
  const yAxisWidth = Math.max(56, Math.min(longestLabel * 8 + 12, 120))
  const computedHeight = height ?? Math.max(200, data.length * 44 + 40)

  return (
    <div className={cn(className)}>
      <ResponsiveContainer width="100%" height={computedHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: showLabels ? 72 : 16, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid horizontal={false} {...recharts.grid} />
          <XAxis
            type="number"
            tick={recharts.xAxis.tick}
            tickFormatter={(v) => formatValue(v)}
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
            formatter={(value: number, _name: string, props: { payload?: HBarEntry }) => {
              if (formatTooltip && props.payload) return [formatTooltip(props.payload), '']
              return [formatValue(value), 'Value']
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={barSize}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={entry.color ?? seriesColor(i)} />
            ))}
            {showLabels && (
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: number) => formatValue(v)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  fill: 'var(--color-foreground)',
                }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
