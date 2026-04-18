import { useState, useEffect } from 'react'
import { Bot, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOptionsStrategy, type OptionsStrategy } from '@/api/options'

interface OptionsStrategyPanelProps {
  symbol: string
}

export function OptionsStrategyPanel({ symbol }: OptionsStrategyPanelProps) {
  const [strategy, setStrategy] = useState<OptionsStrategy | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    getOptionsStrategy(symbol)
      .then(data => {
        if (!cancelled) setStrategy(data)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load strategy')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [symbol])

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-purple-500/30 bg-card p-5">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (error || !strategy) {
    return (
      <div className="rounded-xl border border-purple-500/30 bg-card p-5">
        <p className="text-sm text-muted-foreground">{error ?? 'No strategy available'}</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-purple-500/30 bg-card p-5 space-y-4')}>
      {/* AI header */}
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
          AI Strategy Analysis
        </span>
      </div>

      {/* Strategy name */}
      <div>
        <h3 className="text-base font-bold text-foreground">{strategy.strategyName}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{strategy.reasoning}</p>
      </div>

      {/* Earnings warning */}
      {strategy.earningsWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{strategy.earningsWarning}</span>
        </div>
      )}

      {/* Greeks unavailable notice */}
      {strategy.greeksUnavailable && (
        <p className="text-xs text-muted-foreground italic">
          Greeks data unavailable for this contract — estimates only.
        </p>
      )}

      {/* Contract details table */}
      {strategy.contractDetails && (
        <div className="rounded-lg border border-border bg-muted/30">
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: 'Option Type', value: strategy.contractDetails.optionType },
                {
                  label: 'Suggested Strike',
                  value: strategy.contractDetails.suggestedStrike.toLocaleString('en-US', {
                    style: 'currency', currency: 'USD',
                  }),
                },
                { label: 'Suggested Expiry', value: strategy.contractDetails.suggestedExpiry },
                {
                  label: 'Estimated Premium',
                  value: strategy.contractDetails.estimatedPremium.toLocaleString('en-US', {
                    style: 'currency', currency: 'USD',
                  }),
                },
                {
                  label: 'Max Loss',
                  value: strategy.contractDetails.maxLoss.toLocaleString('en-US', {
                    style: 'currency', currency: 'USD',
                  }),
                },
                {
                  label: 'Breakeven',
                  value: strategy.contractDetails.breakeven.toLocaleString('en-US', {
                    style: 'currency', currency: 'USD',
                  }),
                },
              ].map(({ label, value }) => (
                <tr key={label} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{label}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-foreground">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        AI analysis is advisory only. Verify all details before placing an order.
      </p>
    </div>
  )
}
