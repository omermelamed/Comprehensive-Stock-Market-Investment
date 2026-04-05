import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '@/features/onboarding/useOnboarding'
import type { UserProfile } from '@/types'
import { OnboardingLayout } from '@/layouts/onboarding-layout'
import { StepDots } from '@/components/shared/step-dots'
import { ProfileSetup } from '@/components/onboarding/profile-setup'
import { StepReview } from '@/components/onboarding/step-review'
import Step2Questionnaire from '@/features/onboarding/Step2Questionnaire'
import Step3TargetAllocation from '@/features/onboarding/Step3TargetAllocation'
import Step4InitialHoldings from '@/features/onboarding/Step4InitialHoldings'
import { slideStep, stepTransition } from '@/lib/motion'

// Step 1 (ProfileSetup) has its own inner dots (1–5).
// Steps 2–5 are shown as 1–4 in the outer dots so the user doesn't see "2 of 5" after finishing setup.
const OUTER_STEPS = 4

interface Props {
  onComplete: (profile: UserProfile) => void
}

export default function OnboardingPage({ onComplete }: Props) {
  const navigate = useNavigate()
  const { step, data, submitting, saving, saveError, error, updateData, next, back, submit, direction } =
    useOnboarding((profile) => { onComplete(profile); navigate('/') })

  return (
    <OnboardingLayout>
      {step > 1 && (
        <StepDots
          current={step - 1}
          total={OUTER_STEPS}
          section={
            step === 2 ? 'Risk Profile' :
            step === 3 ? 'Portfolio Setup' :
            step === 4 ? 'Portfolio Setup' :
            'Almost Done'
          }
          label={
            step === 2 ? 'Questionnaire' :
            step === 3 ? 'Target Allocation' :
            step === 4 ? 'Initial Holdings' :
            'Review'
          }
        />
      )}

      {/* Block all interactions while a step is being saved */}
      <div className={saving ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideStep}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            {step === 1 && (
              <ProfileSetup data={data} onUpdate={updateData} onNext={next} />
            )}
            {step === 2 && (
              <Step2Questionnaire data={data} onUpdate={updateData} onNext={next} onBack={back} />
            )}
            {step === 3 && (
              <Step3TargetAllocation data={data} onUpdate={updateData} onNext={next} onBack={back} />
            )}
            {step === 4 && (
              <Step4InitialHoldings data={data} onUpdate={updateData} onNext={next} onBack={back} />
            )}
            {step === 5 && (
              <StepReview data={data} onSubmit={submit} onBack={back} submitting={submitting} error={error} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {saving && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-3 text-center text-xs text-muted-foreground"
          >
            Saving…
          </motion.p>
        )}
        {saveError && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-3 text-center text-xs text-destructive"
          >
            {saveError}
          </motion.p>
        )}
      </AnimatePresence>
    </OnboardingLayout>
  )
}
