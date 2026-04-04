import { useState } from 'react'
import { createProfile, completeOnboarding } from '../../api/profile'
import { bulkReplaceAllocations } from '../../api/allocations'
import { createTransaction } from '../../api/transactions'

export interface OnboardingData {
  displayName: string
  preferredCurrency: string
  questionnaireAnswers: Record<string, number>
  tracksEnabled: string[]
  monthlyInvestmentMin: number
  monthlyInvestmentMax: number
  investmentGoal: string
  timeHorizonYears: number
  allocations: Array<{
    symbol: string
    assetType: string
    targetPercentage: number
    label: string
    displayOrder: number
  }>
  initialHoldings: Array<{
    symbol: string
    track: string
    quantity: number
    pricePerUnit: number
    transactionDate: string
  }>
}

export function useOnboarding(onComplete: () => void) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateData(patch: Partial<OnboardingData>) {
    setData(prev => ({ ...prev, ...patch }))
  }

  function next() {
    setStep(s => Math.min(s + 1, 5))
  }

  function back() {
    setStep(s => Math.max(s - 1, 1))
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      await createProfile({
        displayName: data.displayName,
        preferredCurrency: data.preferredCurrency,
        questionnaireAnswers: data.questionnaireAnswers,
        tracksEnabled: data.tracksEnabled,
        monthlyInvestmentMin: data.monthlyInvestmentMin,
        monthlyInvestmentMax: data.monthlyInvestmentMax,
        investmentGoal: data.investmentGoal,
        timeHorizonYears: data.timeHorizonYears,
      })

      if (data.allocations && data.allocations.length > 0) {
        await bulkReplaceAllocations(data.allocations)
      }

      const currency = data.preferredCurrency ?? 'USD'
      for (const holding of data.initialHoldings ?? []) {
        await createTransaction({
          symbol: holding.symbol,
          transactionType: 'BUY',
          quantity: holding.quantity,
          pricePerUnit: holding.pricePerUnit,
          totalAmount: holding.quantity * holding.pricePerUnit,
          fees: 0,
          currency,
          transactionDate: holding.transactionDate,
          track: holding.track,
        })
      }

      await completeOnboarding()
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return { step, data, submitting, error, updateData, next, back, submit }
}
