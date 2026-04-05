import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectableTileProps {
  selected: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

export function SelectableTile({ selected, onClick, disabled, children, className }: SelectableTileProps) {
  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? {} : { scale: 0.97 }}
      className={cn(
        'relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-input bg-card hover:border-primary/30',
        disabled && 'cursor-default',
        !disabled && !selected && 'cursor-pointer',
        className,
      )}
    >
      {children}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10"
          >
            <Check className="h-3 w-3 text-success" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
