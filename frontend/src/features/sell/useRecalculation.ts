import { useState, useEffect, useCallback, useRef } from 'react'
import { getRecalculationStatus, retryRecalculation, type RecalculationStatus } from '@/api/sell'

export function useRecalculation() {
  const [status, setStatus] = useState<RecalculationStatus | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasRunning = useRef(false)

  const poll = useCallback(async () => {
    try {
      const s = await getRecalculationStatus()
      setStatus(s)

      if (wasRunning.current && s.status === 'COMPLETED') {
        setJustCompleted(true)
        setTimeout(() => setJustCompleted(false), 3000)
      }

      wasRunning.current = s.status === 'IN_PROGRESS' || s.status === 'PENDING'

      if (s.status === 'IN_PROGRESS' || s.status === 'PENDING') {
        if (!intervalRef.current) {
          intervalRef.current = setInterval(async () => {
            try {
              const updated = await getRecalculationStatus()
              setStatus(updated)
              if (wasRunning.current && (updated.status === 'COMPLETED' || updated.status === 'IDLE')) {
                setJustCompleted(true)
                setTimeout(() => setJustCompleted(false), 3000)
                wasRunning.current = false
                if (intervalRef.current) {
                  clearInterval(intervalRef.current)
                  intervalRef.current = null
                }
              }
              if (updated.status === 'FAILED') {
                wasRunning.current = false
                if (intervalRef.current) {
                  clearInterval(intervalRef.current)
                  intervalRef.current = null
                }
              }
            } catch {
              // ignore polling errors
            }
          }, 2000)
        }
      }
    } catch {
      // ignore initial poll error
    }
  }, [])

  useEffect(() => {
    poll()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [poll])

  const startPolling = useCallback(() => {
    wasRunning.current = true
    poll()
  }, [poll])

  const retry = useCallback(async (jobId: string) => {
    try {
      const s = await retryRecalculation(jobId)
      setStatus(s)
      startPolling()
    } catch {
      // error handled by status display
    }
  }, [startPolling])

  const isRunning = status?.status === 'IN_PROGRESS' || status?.status === 'PENDING'
  const isFailed = status?.status === 'FAILED'

  return {
    status,
    isRunning,
    isFailed,
    justCompleted,
    startPolling,
    retry,
  }
}
