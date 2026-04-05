import { useState, useMemo } from 'react'
import { previewMonthlyFlow, confirmMonthlyFlow } from '@/api/monthly-flow'
import type { MonthlyFlowConfirmResult, MonthlyFlowPreview } from '@/types'

export function useMonthlyFlow() {
  const [budget, setBudget] = useState('')
  const [preview, setPreview] = useState<MonthlyFlowPreview | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState<MonthlyFlowConfirmResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parsedBudget = useMemo(() => {
    const n = parseFloat(budget)
    return isNaN(n) ? 0 : n
  }, [budget])

  const effectiveAllocations = useMemo(() => {
    if (!preview) return []
    return preview.positions.map((pos) => {
      const raw = overrides[pos.symbol]
      const amount = raw !== undefined ? parseFloat(raw) : pos.suggestedAmount
      return { symbol: pos.symbol, amount: isNaN(amount) ? 0 : amount }
    })
  }, [preview, overrides])

  const totalAllocated = useMemo(
    () => effectiveAllocations.reduce((sum, e) => sum + e.amount, 0),
    [effectiveAllocations]
  )

  const remaining = parsedBudget - totalAllocated

  async function loadPreview() {
    const n = parseFloat(budget)
    if (isNaN(n) || n <= 0) {
      setError('Enter a budget greater than zero')
      return
    }
    setError(null)
    setIsLoadingPreview(true)
    setConfirmResult(null)
    try {
      const result = await previewMonthlyFlow(n)
      setPreview(result)
      const initial: Record<string, string> = {}
      result.positions.forEach((pos) => {
        initial[pos.symbol] = pos.suggestedAmount.toFixed(2)
      })
      setOverrides(initial)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load preview')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  function setOverride(symbol: string, value: string) {
    setOverrides((prev) => ({ ...prev, [symbol]: value }))
  }

  async function confirmFlow() {
    if (!preview) return
    if (totalAllocated > parsedBudget) {
      setError('Total allocation exceeds budget')
      return
    }
    const investable = effectiveAllocations.filter((e) => e.amount > 0)
    if (investable.length === 0) {
      setError('No amounts to invest')
      return
    }
    setError(null)
    setIsConfirming(true)
    try {
      const result = await confirmMonthlyFlow(parsedBudget, investable)
      setConfirmResult(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Confirmation failed')
    } finally {
      setIsConfirming(false)
    }
  }

  function reset() {
    setBudget('')
    setPreview(null)
    setOverrides({})
    setConfirmResult(null)
    setError(null)
  }

  return {
    budget,
    setBudget,
    preview,
    overrides,
    isLoadingPreview,
    isConfirming,
    confirmResult,
    error,
    parsedBudget,
    effectiveAllocations,
    totalAllocated,
    remaining,
    loadPreview,
    setOverride,
    confirmFlow,
    reset,
  }
}
