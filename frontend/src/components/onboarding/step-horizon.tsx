import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { SectionHeader } from '@/components/shared/section-header'
import { StepFooter } from './step-footer'
import { HORIZONS, HORIZON_STRATEGY } from '@/data/onboarding'
import { cn } from '@/lib/utils'

interface StepHorizonProps {
  value: number
  onValueChange: (v: number) => void
  onContinue: () => void
  onBack?: () => void
}

export function StepHorizon({ value, onValueChange, onContinue, onBack }: StepHorizonProps) {
  const idx = HORIZONS.findIndex(h => h.value === value)
  const pct = idx >= 0 ? (idx / (HORIZONS.length - 1)) * 100 : 0
  const strategy = HORIZON_STRATEGY[value]

  return (
    <div>
      <SectionHeader title="How long are you investing for?" />

      {/* Segmented pills */}
      <div className="mb-6 inline-flex w-full rounded-xl border border-input bg-muted/50 p-1">
        {HORIZONS.map(h => {
          const sel = h.value === value
          return (
            <button
              key={h.value}
              type="button"
              onClick={() => onValueChange(h.value)}
              className={cn(
                'flex-1 rounded-lg py-2 text-xs font-medium transition-all duration-200',
                sel
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {h.label}
            </button>
          )
        })}
      </div>

      {/* Progress line */}
      <Progress value={pct} className="mb-4" />

      {/* Strategy label */}
      <AnimatePresence mode="wait">
        {strategy && (
          <motion.p
            key={value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm"
          >
            <span className="font-semibold">{strategy.title}</span>{' '}
            <span className="text-muted-foreground">{strategy.rec}</span>
          </motion.p>
        )}
      </AnimatePresence>

      <StepFooter onContinue={onContinue} onBack={onBack} disabled={idx < 0} />
    </div>
  )
}
