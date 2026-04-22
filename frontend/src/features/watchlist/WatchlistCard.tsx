import { useNavigate } from 'react-router-dom'
import { AlertTriangle, PlusCircle } from 'lucide-react'
import { Sparkline } from '@/components/charts'
import type { WatchlistItem } from '@/types'
import { useSparkline } from '@/hooks/useSparkline'

interface Props {
  item: WatchlistItem
  onRemove: (id: string) => void
  isOverweight?: boolean
  onSetAlert?: (symbol: string) => void
}

export function WatchlistCard({ item, onRemove, isOverweight, onSetAlert }: Props) {
  const navigate = useNavigate()
  const { data: sparklineData } = useSparkline(item.symbol)

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-mono text-base font-bold text-card-foreground">{item.symbol}</p>
            {item.companyName && (
              <p className="text-xs text-muted-foreground">{item.companyName}</p>
            )}
          </div>
          {sparklineData && <Sparkline data={sparklineData} width={64} height={28} />}
        </div>
        <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {item.assetType}
        </span>
      </div>

      {/* Overweight warning */}
      {isOverweight && (
        <div className="flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
          <span className="text-xs font-medium text-warning">Already overweight in your portfolio</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          {onSetAlert && (
            <button
              onClick={() => onSetAlert(item.symbol)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Set Alert
            </button>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            Remove
          </button>
        </div>
        <button
          onClick={() => navigate(`/transactions/new?symbol=${item.symbol}`)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <PlusCircle className="h-3 w-3" />
          Add to Portfolio
        </button>
      </div>
    </div>
  )
}
