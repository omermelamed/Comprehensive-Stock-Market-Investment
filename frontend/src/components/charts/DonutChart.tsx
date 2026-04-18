import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { seriesColor, recharts } from '@/lib/chart-theme'
import { cn } from '@/lib/utils'

export interface DonutSlice {
  name: string
  value: number
  color?: string
}

interface DonutChartProps {
  data: DonutSlice[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  centerLabel?: string
  centerValue?: string
  formatValue?: (value: number) => string
  showLegend?: boolean
  className?: string
}

export function DonutChart({
  data,
  height = 260,
  innerRadius = 60,
  outerRadius = 95,
  centerLabel,
  centerValue,
  formatValue = (v) => `${v.toFixed(1)}%`,
  showLegend = true,
  className,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className={cn('relative', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? seriesColor(i)}
                className="outline-none"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={recharts.tooltip.contentStyle}
            labelStyle={recharts.tooltip.labelStyle}
            formatter={(value: number, name: string) => [
              `${formatValue(value)} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="tabular-nums font-mono text-lg font-bold text-foreground">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
          )}
        </div>
      )}

      {showLegend && (
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
    </div>
  )
}
