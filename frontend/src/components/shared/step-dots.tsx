import { motion } from 'framer-motion'

interface StepDotsProps {
  current: number
  total: number
  label?: string
  section?: string
}

export function StepDots({ current, total, label, section }: StepDotsProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      {section && (
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
          {section}
        </span>
      )}
      <div className="flex items-center gap-3 ml-auto">
        <span className="text-sm font-medium text-muted-foreground">
          {label ?? `Step ${current} of ${total}`}
        </span>
        <div className="flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => {
          const done = i < current - 1
          const active = i === current - 1
          return (
            <motion.div
              key={i}
              animate={{
                width: active ? 24 : 8,
                backgroundColor: done || active ? 'var(--primary)' : '#D4D4E8',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="h-2 rounded-full"
            />
          )
        })}
        </div>
      </div>
    </div>
  )
}
