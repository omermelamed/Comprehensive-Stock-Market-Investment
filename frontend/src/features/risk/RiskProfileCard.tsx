import { cn } from '@/lib/utils'
import type { RiskHistoryEntry } from '@/api/riskProfile'

interface RiskProfileCardProps {
  current: RiskHistoryEntry | null
}

const RISK_LEVEL_STYLES: Record<RiskHistoryEntry['riskLevel'], string> = {
  CONSERVATIVE: 'bg-success/15 text-success border-success/30',
  MODERATE: 'bg-warning/15 text-warning border-warning/30',
  AGGRESSIVE: 'bg-destructive/15 text-destructive border-destructive/30',
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

export function RiskProfileCard({ current }: RiskProfileCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Risk Profile</h2>
      </div>

      {current === null ? (
        <p className="text-sm text-muted-foreground">
          No risk evaluation available yet.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <RiskLevelBadge level={current.riskLevel} />
            <span className="text-xs text-muted-foreground">
              {current.transactionCountAtUpdate} transactions at update
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
