import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../features/onboarding/useOnboarding'
import Step1BasicInfo from '../features/onboarding/Step1BasicInfo'
import Step2Questionnaire from '../features/onboarding/Step2Questionnaire'
import Step3TargetAllocation from '../features/onboarding/Step3TargetAllocation'
import Step4InitialHoldings from '../features/onboarding/Step4InitialHoldings'
import Step5Confirmation from '../features/onboarding/Step5Confirmation'

const STEP_LABELS = ['Basic Info', 'Risk Profile', 'Allocations', 'Holdings', 'Confirm']
const TOTAL_STEPS = 5

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex gap-1">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const filled = stepNum <= currentStep
          return (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  filled ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              />
              <p className={`text-xs mt-1 text-center ${filled ? 'text-blue-400' : 'text-gray-500'}`}>
                {label}
              </p>
            </div>
          )
        })}
      </div>
      <p className="text-gray-500 text-xs text-right mt-1">
        Step {currentStep} of {TOTAL_STEPS}
      </p>
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { step, data, submitting, error, updateData, next, back, submit } = useOnboarding(() => {
    navigate('/')
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-gray-800 rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-2">Investment Platform Setup</h1>
        <p className="text-gray-400 text-sm mb-6">Let's get your portfolio configured.</p>

        <ProgressBar currentStep={step} />

        {step === 1 && (
          <Step1BasicInfo data={data} onUpdate={updateData} onNext={next} />
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
          <Step5Confirmation
            data={data}
            onBack={back}
            onSubmit={submit}
            submitting={submitting}
            error={error}
          />
        )}
      </div>
    </div>
  )
}
