import { useState, useEffect, useRef } from 'react'
import { getOhlcData } from '@/api/portfolio'

const cache = new Map<string, number[]>()

export function useSparkline(symbol: string | null) {
  const [data, setData] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!symbol) return
    if (fetchedRef.current === symbol) return

    const cached = cache.get(symbol)
    if (cached) {
      setData(cached)
      fetchedRef.current = symbol
      return
    }

    fetchedRef.current = symbol
    setLoading(true)
    getOhlcData(symbol, '3M')
      .then(res => {
        const closes = res.bars.map(b => b.close)
        cache.set(symbol, closes)
        setData(closes)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [symbol])

  return { data, loading }
}
