import { useState, useEffect, useRef } from 'react'
import { getProfile, createProfile, updateProfile, completeOnboarding } from '../../api/profile'
import type { UserProfile } from '../../types'
import { getAllocations, bulkReplaceAllocations } from '../../api/allocations'
import { getHoldings } from '../../api/holdings'
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
  timezone: string
  whatsappNumber: string
  whatsappEnabled: boolean
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

function buildProfilePayload(data: Partial<OnboardingData>) {
  const storedTheme = localStorage.getItem('theme')
  const theme = storedTheme === 'light' ? 'LIGHT' : 'DARK'
  return {
    displayName: data.displayName ?? '',
    preferredCurrency: data.preferredCurrency ?? 'USD',
    questionnaireAnswers: data.questionnaireAnswers ?? {},
    tracksEnabled: data.tracksEnabled ?? ['LONG_EQUITY'],
    monthlyInvestmentMin: data.monthlyInvestmentMin ?? 0,
    monthlyInvestmentMax: data.monthlyInvestmentMax ?? 0,
    investmentGoal: data.investmentGoal ?? '',
    timeHorizonYears: data.timeHorizonYears ?? 10,
    theme,
    timezone: data.timezone ?? 'UTC',
    whatsappNumber: data.whatsappNumber ?? null,
    whatsappEnabled: data.whatsappEnabled ?? false,
  }
}

export function useOnboarding(onComplete: (profile: UserProfile) => void) {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Tracks whether a profile row already exists in the backend
  const profileExists = useRef(false)
  // Tracks which holding symbols are already saved as transactions
  const savedHoldingSymbols = useRef<Set<string>>(new Set())

  // On mount: try to restore an in-progress draft
  useEffect(() => {
    void loadDraft()
  }, [])

  async function loadDraft() {
    try {
      const profile = await getProfile()
      if (!profile || profile.onboardingCompleted) return

      profileExists.current = true

      const restoredData: Partial<OnboardingData> = {
        displayName: profile.displayName,
        preferredCurrency: profile.preferredCurrency,
        investmentGoal: profile.investmentGoal,
        timeHorizonYears: profile.timeHorizonYears,
        monthlyInvestmentMin: profile.monthlyInvestmentMin,
        monthlyInvestmentMax: profile.monthlyInvestmentMax,
        tracksEnabled: profile.tracksEnabled,
        questionnaireAnswers: profile.questionnaireAnswers ?? {},
        timezone: profile.timezone ?? 'UTC',
        whatsappNumber: profile.whatsappNumber ?? '',
        whatsappEnabled: profile.whatsappEnabled ?? false,
      }

      const hasQuestionnaire = Object.keys(profile.questionnaireAnswers ?? {}).length > 0

      // Restore allocations
      const allocations = await getAllocations()
      if (allocations.length > 0) {
        restoredData.allocations = allocations.map(a => ({
          symbol: a.symbol,
          assetType: a.assetType,
          targetPercentage: a.targetPercentage,
          label: a.label,
          displayOrder: a.displayOrder,
        }))
      }

      // Restore holdings from saved transactions
      const holdings = await getHoldings()
      if (holdings.length > 0) {
        restoredData.initialHoldings = holdings.map(h => ({
          symbol: h.symbol,
          track: h.track,
          quantity: h.netQuantity,
          pricePerUnit: h.avgBuyPrice,
          transactionDate: new Date().toISOString().slice(0, 10),
        }))
        savedHoldingSymbols.current = new Set(holdings.map(h => h.symbol))
      }

      setData(restoredData)

      // Resume at the appropriate step
      if (allocations.length > 0) {
        setStep(5) // Allocations done — go straight to review
      } else if (hasQuestionnaire) {
        setStep(3)
      } else {
        setStep(2) // Profile saved — resume at questionnaire
      }
    } catch {
      // No draft or network error — start from scratch
    }
  }

  function updateData(patch: Partial<OnboardingData>) {
    setData(prev => ({ ...prev, ...patch }))
  }

  async function saveStep(currentStep: number, latestData: Partial<OnboardingData>): Promise<boolean> {
    setSaving(true)
    setSaveError(null)
    try {
      if (currentStep === 1) {
        const payload = buildProfilePayload(latestData)
        if (profileExists.current) {
          await updateProfile(payload)
        } else {
          await createProfile(payload)
          profileExists.current = true
        }
      } else if (currentStep === 2) {
        // Update profile with questionnaire answers
        await updateProfile(buildProfilePayload(latestData))
      } else if (currentStep === 3) {
        if (latestData.allocations && latestData.allocations.length > 0) {
          await bulkReplaceAllocations(latestData.allocations)
        }
      } else if (currentStep === 4) {
        // Only save holdings not already persisted
        const currency = latestData.preferredCurrency ?? 'USD'
        const newHoldings = (latestData.initialHoldings ?? []).filter(
          h => h.symbol.trim() !== '' && !savedHoldingSymbols.current.has(h.symbol),
        )
        for (const holding of newHoldings) {
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
          savedHoldingSymbols.current.add(holding.symbol)
        }
      }
      return true
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  // next() captures the latest data via a callback to avoid stale closure
  function next() {
    setData(latestData => {
      void (async () => {
        const saved = await saveStep(step, latestData)
        if (saved) {
          setDirection(1)
          setStep(s => Math.min(s + 1, 5))
        }
      })()
      return latestData
    })
  }

  function back() {
    setSaveError(null)
    setDirection(-1)
    setStep(s => Math.max(s - 1, 1))
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const updatedProfile = await completeOnboarding()
      onComplete(updatedProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return { step, direction, data, submitting, saving, saveError, error, updateData, next, back, submit }
}
