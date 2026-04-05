import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SectionHeader } from '@/components/shared/section-header'
import { cn } from '@/lib/utils'
import type { OnboardingData } from './useOnboarding'

interface Question {
  key: string
  label: string
  options: string[]
}

const QUESTIONS: Question[] = [
  { key: 'riskTolerance', label: 'Your portfolio drops 20% in a month. What do you do?', options: ['Panic and sell everything', 'Worried but hold', 'Stay the course', 'See it as opportunity', 'Aggressively buy more'] },
  { key: 'incomeStability', label: 'How stable is your income?', options: ['Very unstable', 'Somewhat unstable', 'Stable', 'Very stable', 'Multiple strong sources'] },
  { key: 'investmentExperience', label: 'How long have you been investing?', options: ['Never invested', '< 1 year', '1–3 years', '3–7 years', '> 7 years'] },
  { key: 'liquidityNeed', label: 'How likely are you to need these funds within 2 years?', options: ['Very likely', 'Likely', 'Possible', 'Unlikely', 'Very unlikely'] },
  { key: 'portfolioObjective', label: 'What is your primary investment objective?', options: ['Capital preservation', 'Income generation', 'Balanced growth', 'Growth', 'Aggressive growth'] },
  { key: 'shortSellingComfort', label: 'How comfortable are you with short selling or derivatives?', options: ['Not at all', 'A little', 'Moderate', 'Comfortable', 'Very comfortable'] },
]

// 6 questions × 5 max = 30 max score. Time horizon adds up to 5 on the backend → effective max ~35.
// Thresholds here are for display only; backend computes the authoritative risk level.
function getRisk(score: number) {
  if (score <= 14) return { label: 'Conservative', color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20', barColor: 'bg-warning', width: 30 }
  if (score <= 22) return { label: 'Moderate', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-500/20', barColor: 'bg-blue-500', width: 65 }
  return { label: 'Aggressive', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-500/20', barColor: 'bg-purple-500', width: 100 }
}

interface Props {
  data: Partial<OnboardingData>
  onUpdate: (patch: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2Questionnaire({ data, onUpdate, onNext, onBack }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>(data.questionnaireAnswers ?? {})

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === QUESTIONS.length
  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0)
  const risk = allAnswered ? getRisk(totalScore) : null

  function handleNext() {
    onUpdate({ questionnaireAnswers: answers })
    onNext()
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Let's calibrate your risk profile"
        description="Your answers determine how aggressive or conservative your strategy should be."
      />

      <div className="flex items-center gap-3">
        <Progress value={(answeredCount / QUESTIONS.length) * 100} className="flex-1" />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {answeredCount} / {QUESTIONS.length}
        </span>
      </div>

      <div
        className="max-h-[380px] space-y-5 overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}
      >
        {QUESTIONS.map((q, qIdx) => (
          <div key={q.key}>
            <p className="mb-2 text-sm font-medium">
              <span className="text-muted-foreground">{qIdx + 1}.</span> {q.label}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, idx) => {
                const value = idx + 1
                const selected = answers[q.key] === value
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [q.key]: value }))}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all duration-200',
                      selected
                        ? 'border-primary bg-primary/5 font-semibold text-primary'
                        : 'border-input bg-muted/30 text-muted-foreground',
                    )}
                  >
                    <span>{opt}</span>
                    <AnimatePresence>
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10"
                        >
                          <Check className="h-3 w-3 text-success" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {risk && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={cn('rounded-xl border p-4', risk.bg, risk.border)}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Risk profile</span>
              <span className={cn('rounded-lg px-2.5 py-0.5 text-xs font-bold', risk.color, risk.bg)}>
                {risk.label}
              </span>
            </div>
            <Progress value={risk.width} indicatorClassName={risk.barColor} />
            <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">Score: {totalScore}/30</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button
          onClick={allAnswered ? handleNext : undefined}
          disabled={!allAnswered}
          className="flex-1"
        >
          Continue →
        </Button>
      </div>
    </div>
  )
}
