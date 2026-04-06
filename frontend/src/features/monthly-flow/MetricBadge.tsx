import { cn } from '@/lib/utils'

type Signal = 'good' | 'fair' | 'poor'

const SIGNAL_STYLES: Record<Signal, string> = {
  good: 'bg-success',
  fair: 'bg-warning',
  poor: 'bg-destructive',
}

function classify(value: number | null | undefined, goodBelow: number, fairBelow: number): Signal | null {
  if (value == null) return null
  if (value < goodBelow) return 'good'
  if (value < fairBelow) return 'fair'
  return 'poor'
}

interface MetricDef {
  label: string
  value: number | null | undefined
  signal: Signal | null
}

interface Props {
  peRatio?: number | null
  pegRatio?: number | null
  eps?: number | null
  dividendYield?: number | null
}

export function MetricBadges({ peRatio, pegRatio, eps, dividendYield }: Props) {
  const metrics: MetricDef[] = [
    { label: 'P/E', value: peRatio, signal: classify(peRatio, 15, 25) },
    { label: 'PEG', value: pegRatio, signal: classify(pegRatio, 1, 2) },
    {
      label: 'EPS',
      value: eps,
      signal: eps != null ? (eps > 3 ? 'good' : eps > 0 ? 'fair' : 'poor') : null,
    },
    {
      label: 'Div',
      value: dividendYield != null ? dividendYield * 100 : null,
      signal: dividendYield != null ? (dividendYield > 0.03 ? 'good' : dividendYield > 0.01 ? 'fair' : 'poor') : null,
    },
  ]

  const visible = metrics.filter(m => m.signal !== null)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map(m => (
        <span key={m.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className={cn('inline-block h-1.5 w-1.5 rounded-full', SIGNAL_STYLES[m.signal!])} />
          {m.label}
          <span className="font-mono">
            {m.label === 'Div' ? `${m.value!.toFixed(1)}%` : m.value!.toFixed(1)}
          </span>
        </span>
      ))}
    </div>
  )
}
