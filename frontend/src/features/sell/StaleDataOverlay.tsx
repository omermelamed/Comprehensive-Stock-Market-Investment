import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

interface StaleDataOverlayProps {
  visible: boolean
  sellDate?: string
}

export function StaleDataOverlay({ visible, sellDate }: StaleDataOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/40 dark:bg-black/45 backdrop-blur-[1px]"
        >
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Updating...</p>
          {sellDate && (
            <p className="text-xs text-muted-foreground/70">
              Data from {new Date(sellDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} onward is being recalculated
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
