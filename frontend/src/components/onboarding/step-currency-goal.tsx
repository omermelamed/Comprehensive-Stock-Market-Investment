import { useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/shared/section-header'
import { StepFooter } from './step-footer'
import { CURRENCIES, GOAL_CHIPS } from '@/data/onboarding'
import { cn } from '@/lib/utils'

interface StepCurrencyGoalProps {
  currency: string
  onCurrencyChange: (v: string) => void
  goal: string
  onGoalChange: (v: string) => void
  onContinue: () => void
  onBack?: () => void
}

export function StepCurrencyGoal({
  currency, onCurrencyChange, goal, onGoalChange, onContinue, onBack,
}: StepCurrencyGoalProps) {
  const [goalFocused, setGoalFocused] = useState(false)

  return (
    <div>
      <SectionHeader title="Choose your currency" />

      {/* Currency cards — single select */}
      <div className="mb-8 grid grid-cols-4 gap-2">
        {CURRENCIES.map(c => {
          const sel = currency === c.value
          return (
            <motion.button
              key={c.value}
              type="button"
              onClick={() => onCurrencyChange(c.value)}
              whileTap={{ scale: 0.96 }}
              className="flex flex-col items-center rounded-xl py-3.5 transition-all duration-200"
              style={{
                background: sel ? '#2D2B6B' : '#fff',
                border: sel ? '2px solid #2D2B6B' : '2px solid #E8ECF2',
                boxShadow: sel ? '0 2px 12px rgba(45,43,107,0.18)' : 'none',
              }}
            >
              <span className="text-lg font-bold" style={{ color: sel ? '#fff' : '#0F172A' }}>
                {c.symbol}
              </span>
              <span className="text-[11px] font-medium" style={{ color: sel ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}>
                {c.label}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Goal section */}
      <h3 className="mb-3 text-base font-semibold">What's your investment goal?</h3>

      <Input
        value={goal}
        onChange={e => onGoalChange(e.target.value)}
        onFocus={() => setGoalFocused(true)}
        onBlur={() => setGoalFocused(false)}
        placeholder="Building long-term wealth for retirement"
        className={cn('mb-3', goalFocused && 'border-primary ring-2 ring-primary/20')}
      />

      <div className="flex flex-wrap gap-2">
        {GOAL_CHIPS.map(chip => {
          const active = goal === chip
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onGoalChange(goal === chip ? '' : chip)}
              className={cn(
                'rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all duration-200',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-muted/50 text-muted-foreground hover:border-primary/30',
              )}
            >
              {chip}
            </button>
          )
        })}
      </div>

      <StepFooter onContinue={onContinue} onBack={onBack} />
    </div>
  )
}
