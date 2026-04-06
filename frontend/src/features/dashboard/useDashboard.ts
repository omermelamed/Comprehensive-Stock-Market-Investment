import { useState, useEffect, useCallback } from 'react'
import {
  getPortfolioSummary,
  getPortfolioHoldings,
  getPortfolioHistory,
  type PortfolioSummary,
  type HoldingDashboard,
  type PortfolioHistory,
} from '@/api/portfolio'

interface DashboardState {
  summary: PortfolioSummary | null
  holdings: HoldingDashboard[]
  history: PortfolioHistory | null
  historyRange: string
  setHistoryRange: (range: string) => void
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useDashboard(): DashboardState {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [holdings, setHoldings] = useState<HoldingDashboard[]>([])
  const [history, setHistory] = useState<PortfolioHistory | null>(null)
  const [historyRange, setHistoryRangeState] = useState('1M')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Initial load: fetch all three in parallel
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const t0 = performance.now()

    Promise.all([
      getPortfolioSummary(),
      getPortfolioHoldings(),
      getPortfolioHistory(historyRange),
    ])
      .then(([s, h, hist]) => {
        if (cancelled) return
        setSummary(s)
        setHoldings(h)
        setHistory(hist)
      })
      .catch(err => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Failed to load portfolio data'
        setError(msg)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          const elapsed = performance.now() - t0
          if (elapsed > 2000) {
            console.warn(`[Dashboard] Load took ${Math.round(elapsed)}ms (target: <2000ms)`)
          }
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  // Re-fetch history only when range changes (after initial load)
  const [rangeVersion, setRangeVersion] = useState(0)

  useEffect(() => {
    if (rangeVersion === 0) return // skip on mount — covered by full load above
    let cancelled = false

    getPortfolioHistory(historyRange)
      .then(hist => {
        if (!cancelled) setHistory(hist)
      })
      .catch(err => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load history'
          setError(msg)
        }
      })

    return () => {
      cancelled = true
    }
  }, [historyRange, rangeVersion])

  const setHistoryRange = useCallback((range: string) => {
    setHistoryRangeState(range)
    setRangeVersion(v => v + 1)
  }, [])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return { summary, holdings, history, historyRange, setHistoryRange, loading, error, refresh }
}
