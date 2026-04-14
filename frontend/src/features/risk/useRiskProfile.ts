import { useState, useEffect, useCallback } from 'react'
import {
  getRiskHistory,
  triggerRiskEvaluation,
  type RiskHistoryEntry,
} from '@/api/riskProfile'

interface UseRiskProfileResult {
  current: RiskHistoryEntry | null
  history: RiskHistoryEntry[]
  loading: boolean
  error: string | null
  evaluating: boolean
  evaluate: () => Promise<void>
}

export function useRiskProfile(): UseRiskProfileResult {
  const [history, setHistory] = useState<RiskHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState(false)

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getRiskHistory()
      setHistory(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load risk history')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRiskHistory()
      .then(data => {
        if (!cancelled) {
          setHistory(data)
          setError(null)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load risk history')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const evaluate = useCallback(async () => {
    setEvaluating(true)
    try {
      await triggerRiskEvaluation()
      await fetchHistory()
    } finally {
      setEvaluating(false)
    }
  }, [fetchHistory])

  return {
    current: history.length > 0 ? history[0] : null,
    history,
    loading,
    error,
    evaluating,
    evaluate,
  }
}
