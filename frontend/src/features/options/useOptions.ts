import { useEffect, useState, useCallback } from 'react'
import {
  listOptions,
  updateOptionsStatus,
  deleteOptionsTransaction,
  getOptionsStrategy,
} from '../../api/options'
import type { OptionsListResponse, OptionsStrategyResponse } from '../../types'

export function useOptions() {
  const [data, setData] = useState<OptionsListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    listOptions()
      .then(setData)
      .catch(e => setError(e.message ?? 'Failed to load options'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const closePosition = useCallback(async (id: string, status: 'EXPIRED' | 'EXERCISED' | 'CLOSED') => {
    await updateOptionsStatus(id, status)
    load()
  }, [load])

  const remove = useCallback(async (id: string) => {
    await deleteOptionsTransaction(id)
    load()
  }, [load])

  return { data, loading, error, reload: load, closePosition, remove }
}

export function useOptionsStrategy(symbol: string | null) {
  const [strategy, setStrategy] = useState<OptionsStrategyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    getOptionsStrategy(symbol)
      .then(setStrategy)
      .catch(e => setError(e.message ?? 'Failed to fetch strategy'))
      .finally(() => setLoading(false))
  }, [symbol])

  return { strategy, loading, error, fetch }
}
