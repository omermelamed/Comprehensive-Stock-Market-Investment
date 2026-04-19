import { useState, useEffect } from 'react'
import { getDailyBriefing, type DailyBriefingResponse } from '@/api/briefing'

interface BriefingState {
  data: DailyBriefingResponse | null
  loading: boolean
  error: string | null
}

export function useBriefing(): BriefingState {
  const [data, setData] = useState<DailyBriefingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getDailyBriefing()
      .then(d => {
        if (!cancelled) setData(d)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load daily briefing')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
