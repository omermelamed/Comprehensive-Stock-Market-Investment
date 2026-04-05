import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { springTransition } from '@/lib/motion'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, indicatorClassName, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <motion.div
        className={cn('h-full rounded-full bg-primary', indicatorClassName)}
        animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        transition={springTransition}
      />
    </div>
  ),
)
Progress.displayName = 'Progress'

export { Progress }
