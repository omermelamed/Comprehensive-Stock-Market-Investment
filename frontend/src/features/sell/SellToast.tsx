import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/contexts/currency-context'
import { formatMoney } from '@/lib/currency'
import type { SellResult } from '@/api/sell'

interface SellToastProps {
  result: SellResult | null
  onDismiss: () => void
}

export function SellToast({ result, onDismiss }: SellToastProps) {
  const [visible, setVisible] = useState(false)
  const currency = useCurrency()

  useEffect(() => {
    if (result) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onDismiss, 300)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [result, onDismiss])

  if (!result) return null

  const positive = result.pnlUsd >= 0
  const pnlSign = positive ? '+' : ''

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            'fixed bottom-6 right-6 z-[100] flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg max-w-sm',
            'bg-card border-success/30'
          )}
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Sold {result.quantitySold} {result.symbol} at {formatMoney(result.pricePerUnit, 'USD')}
            </p>
            <p className={cn('text-xs font-mono', positive ? 'text-success' : 'text-destructive')}>
              P&L: {pnlSign}{formatMoney(result.pnlDisplay, currency)} ({pnlSign}{result.pnlPercent}%)
            </p>
            {result.isRetroactive && (
              <p className="text-xs text-muted-foreground mt-0.5">Recalculating history...</p>
            )}
            {result.positionClosed && (
              <p className="text-xs text-muted-foreground mt-0.5">{result.symbol} position fully closed</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface ErrorToastProps {
  message: string | null
  onDismiss: () => void
}

export function SellErrorToast({ message, onDismiss }: ErrorToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onDismiss, 300)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [message, onDismiss])

  if (!message) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-[100] flex items-start gap-3 rounded-xl border border-destructive/30 bg-card px-4 py-3 shadow-lg max-w-sm"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-foreground">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
