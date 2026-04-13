import { useState, useEffect, useCallback } from 'react'
import {
  getOptionsPositions,
  createOptionsPosition,
  updateOptionsStatus,
  deleteOptionsPosition,
  getOptionsStrategy,
  type OptionsPosition,
  type CreateOptionsPositionRequest,
  type OptionsStrategy,
} from '@/api/options'

interface OptionsState {
  positions: OptionsPosition[]
  isLoading: boolean
  optionsEnabled: boolean
  error: string | null
  createPosition: (data: CreateOptionsPositionRequest) => Promise<OptionsPosition>
  updateStatus: (id: string, status: 'EXPIRED' | 'EXERCISED' | 'CLOSED') => Promise<void>
  deletePosition: (id: string) => Promise<void>
  getStrategy: (symbol: string) => Promise<OptionsStrategy>
}

export function useOptions(): OptionsState {
  const [positions, setPositions] = useState<OptionsPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [optionsEnabled, setOptionsEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    getOptionsPositions()
      .then(res => {
        if (cancelled) return
        setPositions(res.positions)
        setOptionsEnabled(res.optionsTrackEnabled)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load options')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const createPosition = useCallback(async (data: CreateOptionsPositionRequest) => {
    const position = await createOptionsPosition(data)
    setPositions(prev => [position, ...prev])
    return position
  }, [])

  const updateStatus = useCallback(async (id: string, status: 'EXPIRED' | 'EXERCISED' | 'CLOSED') => {
    const updated = await updateOptionsStatus(id, status)
    setPositions(prev => prev.map(p => p.id === id ? updated : p))
  }, [])

  const deletePosition = useCallback(async (id: string) => {
    await deleteOptionsPosition(id)
    setPositions(prev => prev.filter(p => p.id !== id))
  }, [])

  const getStrategy = useCallback(async (symbol: string) => {
    return getOptionsStrategy(symbol)
  }, [])

  return {
    positions,
    isLoading,
    optionsEnabled,
    error,
    createPosition,
    updateStatus,
    deletePosition,
    getStrategy,
  }
}
