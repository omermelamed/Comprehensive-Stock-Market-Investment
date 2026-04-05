import { useRef, useCallback, useState, useEffect } from 'react'
import { motion, useSpring, useMotionValueEvent } from 'framer-motion'
import { SectionHeader } from '@/components/shared/section-header'
import { StepFooter } from './step-footer'
import { CURRENCIES } from '@/data/onboarding'
import { springTransition } from '@/lib/motion'

interface StepBudgetProps {
  amount: number
  onAmountChange: (v: number) => void
  currency: string
  onContinue: () => void
  onBack?: () => void
}

function useAnimatedNumber(target: number) {
  const sp = useSpring(target, { stiffness: 220, damping: 28 })
  const [v, setV] = useState(target)
  useEffect(() => { sp.set(target) }, [sp, target])
  useMotionValueEvent(sp, 'change', n => setV(Math.round(n)))
  return v
}

function Slider({
  min, max, step, value, onChange,
}: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const pct = ((value - min) / (max - min)) * 100

  const fromClient = useCallback((x: number): number => {
    const r = ref.current!.getBoundingClientRect()
    return Math.round((min + Math.max(0, Math.min(1, (x - r.left) / r.width)) * (max - min)) / step) * step
  }, [min, max, step])

  return (
    <div
      ref={ref}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className="relative flex h-10 cursor-pointer select-none items-center"
      onKeyDown={e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(value + step, max))
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(value - step, min))
      }}
      onPointerDown={e => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        onChange(fromClient(e.clientX))
      }}
      onPointerMove={e => { if (dragging.current && ref.current) onChange(fromClient(e.clientX)) }}
      onPointerUp={() => { dragging.current = false }}
    >
      <div className="absolute h-1.5 w-full rounded-full bg-secondary" />
      <motion.div
        className="absolute h-1.5 rounded-full bg-primary"
        animate={{ width: `${pct}%` }}
        transition={springTransition}
      />
      <motion.div
        className="absolute z-10 -translate-x-1/2 touch-none"
        style={{ left: `${pct}%` }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      >
        <div className="h-5 w-5 rounded-full border-[3px] border-primary bg-card shadow-[0_2px_6px_rgba(91,90,247,0.3)]" />
      </motion.div>
    </div>
  )
}

export function StepBudget({ amount, onAmountChange, currency, onContinue, onBack }: StepBudgetProps) {
  const sym = CURRENCIES.find(c => c.value === currency)?.symbol ?? '$'
  const animAmount = useAnimatedNumber(amount)

  return (
    <div>
      <SectionHeader title="How much do you invest monthly?" />

      <div className="mb-6 text-center">
        <motion.p className="text-4xl font-bold tabular-nums">
          {sym}{animAmount.toLocaleString()}
        </motion.p>
      </div>

      <Slider min={0} max={20000} step={500} value={amount} onChange={onAmountChange} />

      <div className="mt-2 mb-1 flex justify-between">
        <span className="text-xs text-muted-foreground">{sym}0</span>
        <span className="text-xs text-muted-foreground">{sym}20,000</span>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        This helps us optimize your monthly allocation.
      </p>

      <StepFooter onContinue={onContinue} onBack={onBack} />
    </div>
  )
}
