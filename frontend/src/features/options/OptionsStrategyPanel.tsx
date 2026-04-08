import { useEffect } from 'react'
import { X, AlertTriangle, Info } from 'lucide-react'
import { useOptionsStrategy } from './useOptions'
import type { OptionsContractDetails } from '../../types'

interface Props {
  symbol: string
  onClose: () => void
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function ContractDetails({ details }: { details: OptionsContractDetails }) {
  return (
    <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
      <DetailRow label="Type" value={details.optionType} />
      <DetailRow label="Suggested Strike" value={details.suggestedStrike} />
      <DetailRow label="Suggested Expiry" value={details.suggestedExpiry} />
      <DetailRow label="Est. Premium" value={details.estimatedPremium} />
      <DetailRow label="Max Loss" value={details.maxLoss} />
      <DetailRow label="Breakeven" value={details.breakeven} />
    </div>
  )
}

export function OptionsStrategyPanel({ symbol, onClose }: Props) {
  const { strategy, loading, error, fetch } = useOptionsStrategy(symbol)

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-purple-300">AI Options Strategy</h3>
          <p className="text-xs text-muted-foreground">{symbol} — Advisory only</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">Generating strategy…</p>
      )}

      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}

      {strategy && !loading && (
        <div className="mt-4 space-y-3">
          <div>
            <span className="rounded bg-purple-500/20 px-2 py-1 text-xs font-semibold text-purple-300">
              {strategy.strategyName}
            </span>
          </div>

          <p className="text-sm text-foreground leading-relaxed">{strategy.reasoning}</p>

          {strategy.contractDetails && (
            <ContractDetails details={strategy.contractDetails} />
          )}

          {strategy.greeksUnavailable && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Live Greeks require a Polygon.io subscription. Consult your broker for current premium and Greeks data.</span>
            </div>
          )}

          {strategy.earningsWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{strategy.earningsWarning}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            AI suggestions are advisory only. Never commit to a trade based solely on this output.
          </p>
        </div>
      )}
    </div>
  )
}
