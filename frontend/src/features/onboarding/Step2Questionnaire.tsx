import { useState } from 'react'
import type { OnboardingData } from './useOnboarding'

interface Question {
  key: string
  label: string
  options: string[]
}

const QUESTIONS: Question[] = [
  {
    key: 'timeHorizon',
    label: 'Investment time horizon?',
    options: ['< 1 year', '1–3 years', '3–7 years', '7–15 years', '> 15 years'],
  },
  {
    key: 'riskTolerance',
    label: 'How would you react to a 20% portfolio drop?',
    options: ['Panic and sell', 'Worried but hold', 'Neutral', 'See opportunity', 'Aggressively buy more'],
  },
  {
    key: 'incomeStability',
    label: 'How stable is your income?',
    options: ['Very unstable', 'Somewhat unstable', 'Stable', 'Very stable', 'Multiple strong sources'],
  },
  {
    key: 'investmentExperience',
    label: 'Investment experience?',
    options: ['No experience', '< 1 year', '1–3 years', '3–7 years', '> 7 years'],
  },
  {
    key: 'liquidityNeed',
    label: 'Likelihood of needing these funds within 2 years?',
    options: ['Very likely', 'Likely', 'Possible', 'Unlikely', 'Very unlikely'],
  },
  {
    key: 'portfolioObjective',
    label: 'Portfolio primary objective?',
    options: ['Capital preservation', 'Income generation', 'Balanced growth', 'Growth', 'Aggressive growth'],
  },
  {
    key: 'shortSellingComfort',
    label: 'Comfort with short selling or derivatives?',
    options: ['No comfort', 'Little comfort', 'Moderate comfort', 'Comfortable', 'Very comfortable'],
  },
]

function getRiskLevel(score: number): { label: string; color: string } {
  if (score <= 16) return { label: 'CONSERVATIVE', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' }
  if (score <= 26) return { label: 'MODERATE', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' }
  return { label: 'AGGRESSIVE', color: 'text-green-400 bg-green-400/10 border-green-400/30' }
}

interface Props {
  data: Partial<OnboardingData>
  onUpdate: (patch: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2Questionnaire({ data, onUpdate, onNext, onBack }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>(data.questionnaireAnswers ?? {})

  function setAnswer(key: string, value: number) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const allAnswered = QUESTIONS.every(q => answers[q.key] !== undefined)
  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0)
  const riskLevel = allAnswered ? getRiskLevel(totalScore) : null

  function handleNext() {
    onUpdate({ questionnaireAnswers: answers })
    onNext()
  }

  return (
    <div className="space-y-6">
      {QUESTIONS.map(q => (
        <div key={q.key}>
          <p className="text-gray-300 text-sm font-medium mb-2">{q.label}</p>
          <div className="flex flex-col gap-1">
            {q.options.map((opt, idx) => {
              const value = idx + 1
              const selected = answers[q.key] === value
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    selected
                      ? 'bg-blue-600/20 border border-blue-500 text-white'
                      : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.key}
                    value={value}
                    checked={selected}
                    onChange={() => setAnswer(q.key, value)}
                    className="accent-blue-500"
                  />
                  {opt}
                </label>
              )
            })}
          </div>
        </div>
      ))}

      {riskLevel && (
        <div className={`border rounded-lg px-4 py-3 text-sm font-medium ${riskLevel.color}`}>
          Risk Profile: {riskLevel.label} (score: {totalScore}/35)
        </div>
      )}

      <div className="flex justify-between">
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
          onClick={onBack}
        >
          Back
        </button>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleNext}
          disabled={!allAnswered}
        >
          Next
        </button>
      </div>
    </div>
  )
}
