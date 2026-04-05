import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StepDots } from '@/components/shared/step-dots'
import { StepIdentity } from './step-identity'
import { StepCurrencyGoal } from './step-currency-goal'
import { StepHorizon } from './step-horizon'
import { StepBudget } from './step-budget'
import { StepTracks } from './step-tracks'
import { slideStep, stepTransition } from '@/lib/motion'
import type { OnboardingData } from '@/features/onboarding/useOnboarding'

interface ProfileSetupProps {
  data: Partial<OnboardingData>
  onUpdate: (patch: Partial<OnboardingData>) => void
  onNext: () => void
}

const TOTAL_INNER = 5

export function ProfileSetup({ data, onUpdate, onNext }: ProfileSetupProps) {
  const [sub, setSub] = useState(1)
  const [dir, setDir] = useState(1)
  const [name, setName]         = useState(data.displayName       ?? '')
  const [currency, setCurrency] = useState(data.preferredCurrency ?? 'USD')
  const [goal, setGoal]         = useState(data.investmentGoal    ?? '')
  const [horizon, setHorizon]   = useState(data.timeHorizonYears  ?? 15)
  const [amount, setAmount]     = useState(data.monthlyInvestmentMin ?? 4000)
  const [tracks, setTracks]     = useState<string[]>(data.tracksEnabled ?? ['LONG_EQUITY'])

  function fwd() { setDir(1); setSub(s => s + 1) }
  function bck() { setDir(-1); setSub(s => Math.max(s - 1, 1)) }
  function finish() {
    onUpdate({
      displayName: name,
      preferredCurrency: currency,
      investmentGoal: goal,
      timeHorizonYears: horizon,
      monthlyInvestmentMin: amount,
      monthlyInvestmentMax: amount,
      tracksEnabled: tracks,
    })
    onNext()
  }

  return (
    <div>
      <StepDots
        current={sub}
        total={TOTAL_INNER}
        section="Onboarding"
        label={
          sub === 1 ? 'Your Identity' :
          sub === 2 ? 'Currency & Goal' :
          sub === 3 ? 'Time Horizon' :
          sub === 4 ? 'Monthly Budget' :
          'Investment Tracks'
        }
      />

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={sub}
          custom={dir}
          variants={slideStep}
          initial="enter"
          animate="center"
          exit="exit"
          transition={stepTransition}
        >
          {sub === 1 && (
            <StepIdentity name={name} onNameChange={setName} onContinue={fwd} />
          )}
          {sub === 2 && (
            <StepCurrencyGoal
              currency={currency} onCurrencyChange={setCurrency}
              goal={goal} onGoalChange={setGoal}
              onContinue={fwd} onBack={bck}
            />
          )}
          {sub === 3 && (
            <StepHorizon value={horizon} onValueChange={setHorizon} onContinue={fwd} onBack={bck} />
          )}
          {sub === 4 && (
            <StepBudget
              amount={amount} onAmountChange={setAmount}
              currency={currency} onContinue={fwd} onBack={bck}
            />
          )}
          {sub === 5 && (
            <StepTracks tracks={tracks} onTracksChange={setTracks} onContinue={finish} onBack={bck} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
