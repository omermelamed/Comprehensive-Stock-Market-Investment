import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import type { RecalculationStatus } from '@/api/sell'

interface RecalculationBannerProps {
  status: RecalculationStatus | null
  isRunning: boolean
  isFailed: boolean
  justCompleted: boolean
  onRetry: (jobId: string) => void
}

export function RecalculationBanner({ status, isRunning, isFailed, justCompleted, onRetry }: RecalculationBannerProps) {
  const showBanner = isRunning || isFailed || justCompleted

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="overflow-hidden"
        >
          {justCompleted && (
            <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <span className="text-sm text-success">
                Historical data updated from {status?.sellDate
                  ? new Date(status.sellDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'sell date'}
              </span>
            </div>
          )}

          {isRunning && status && (
            <div className="mx-6 mt-4 rounded-xl border border-border bg-card px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-foreground font-medium">
                  Recalculating historical data from{' '}
                  {status.sellDate
                    ? new Date(status.sellDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '...'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={status.progressPercent ?? 0} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground tabular-nums font-mono whitespace-nowrap">
                  {status.daysCompleted ?? 0} / {status.totalDays ?? 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(status.progressPercent ?? 0)}% complete — updating in background
                {status.queuedJobCount && status.queuedJobCount > 0
                  ? ` (${status.queuedJobCount} more queued)`
                  : ''}
              </p>
            </div>
          )}

          {isFailed && status && (
            <div className="mx-6 mt-4 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <span className="text-sm text-destructive font-medium">Recalculation failed</span>
                  {status.errorMessage && (
                    <p className="text-xs text-destructive/70">{status.errorMessage}</p>
                  )}
                </div>
              </div>
              {status.jobId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => onRetry(status.jobId!)}
                >
                  Retry
                </Button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
