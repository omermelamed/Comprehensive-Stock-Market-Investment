import { useMemo, useId } from 'react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}

export function Sparkline({ data, width = 80, height = 32, color, className }: SparklineProps) {
  const id = useId()
  const chartData = useMemo(() => data.map((v, i) => ({ i, v })), [data])

  const isPositive = data.length >= 2 && data[data.length - 1] >= data[0]
  const lineColor = color ?? (isPositive ? 'var(--color-success)' : 'var(--color-destructive)')
  const gradientId = `spark-fill-${id.replace(/:/g, '')}`

  if (data.length < 2) return null

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={lineColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
