import { useEffect, useRef, useState } from 'react'
import { getUnreadCount } from '@/api/alerts'

const POLL_INTERVAL_MS = 60_000

export function useAlertBadge() {
  const [count, setCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchCount() {
    try {
      const data = await getUnreadCount()
      setCount(data.count)
    } catch {
      // silent — never crash nav
    }
  }

  useEffect(() => {
    fetchCount()

    timerRef.current = setInterval(() => {
      // Stop polling when there is nothing to show
      if (count === 0) return
      fetchCount()
    }, POLL_INTERVAL_MS)

    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resume polling when count goes from 0 back to something (e.g. after re-enable)
  useEffect(() => {
    if (count > 0 && timerRef.current === null) {
      timerRef.current = setInterval(fetchCount, POLL_INTERVAL_MS)
    }
    if (count === 0 && timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [count])

  return { count }
}
