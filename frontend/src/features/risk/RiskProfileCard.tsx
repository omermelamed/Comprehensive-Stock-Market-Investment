import { useState, useEffect } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskHistoryEntry } from '@/api/riskProfile'

interface RiskProfileCardProps {
  current: RiskHistoryEntry | null
  evaluating: boolean
  onEvaluate: () => Promise<void>
}

const RISK_LEVEL_STYLES: Record<RiskHistoryEntry['riskLevel'], string> = {
  CONSERVATIVE: 'bg-success/15 text-success border-success/30',
  MODERATE: 'bg-warning/15 text-warning border-warning/30',
  AGGRESSIVE: 'bg-destructive/15 text-destructive border-destructive/30',
}

const RISK_BAR_COLORS: Record<RiskHistoryEntry['riskLevel'], string> = {
  CONSERVATIVE: 'bg-success',
  MODERATE: 'bg-warning',
  AGGRESSIVE: 'bg-destructive',
}

function RiskLevelBadge({ level }: { level: RiskHistoryEntry['riskLevel'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wide',
        RISK_LEVEL_STYLES[level],
      )}
    >
      {level}
    </span>
  )
}

export function RiskProfileCard({ current, evaluating, onEvaluate }: RiskProfileCardProps) {
  const [showUpdated, setShowUpdated] = useState(false)
  const [wasEvaluating, setWasEvaluating] = useState(false)

  useEffect(() => {
    if (wasEvaluating && !evaluating) {
      setShowUpdated(true)
      const timer = setTimeout(() => setShowUpdated(false), 3000)
      return () => clearTimeout(timer)
    }
    setWasEvaluating(evaluating)
  }, [evaluating, wasEvaluating])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Risk Profile</h2>
        <div className="flex items-center gap-3">
          {showUpdated && (
            <span className="text-xs text-success">Updated</span>
          )}
          <button
            onClick={onEvaluate}
            disabled={evaluating}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5',
              'text-xs font-medium text-foreground transition-opacity hover:opacity-80',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {evaluating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {evaluating ? 'Evaluating...' : 'Re-evaluate'}
          </button>
        </div>
      </div>

      {current === null ? (
        <p className="text-sm text-muted-foreground">
          No evaluation yet. Click Re-evaluate to run an AI risk assessment.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <RiskLevelBadge level={current.riskLevel} />
            <span className="text-xs text-muted-foreground">
              {current.transactionCountAtUpdate} transactions at update
            </span>
          </div>

          {current.aiInferredScore !== null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">AI Risk Score</span>
                <span className="tabular-nums font-mono text-foreground">
                  {current.aiInferredScore.toFixed(3)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', RISK_BAR_COLORS[current.riskLevel])}
                  style={{ width: `${current.aiInferredScore * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.000</span>
                <span>1.000</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
