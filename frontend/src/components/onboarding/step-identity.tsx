import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/shared/section-header'
import { StepFooter } from './step-footer'

interface StepIdentityProps {
  name: string
  onNameChange: (v: string) => void
  onContinue: () => void
}

export function StepIdentity({ name, onNameChange, onContinue }: StepIdentityProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [, setFocused] = useState(false)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const valid = name.trim().length > 0

  return (
    <div>
      <SectionHeader
        title="Hello 👋"
        description="Let's build your investment profile"
      />

      <div className="relative">
        <Input
          ref={inputRef}
          value={name}
          onChange={e => onNameChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === 'Enter' && valid && onContinue()}
          placeholder="Your name"
          aria-label="Your name"
        />
        <AnimatePresence>
          {valid && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-success/10"
            >
              <Check className="h-3 w-3 text-success" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        This helps personalize your insights.
      </p>

      <StepFooter onContinue={onContinue} disabled={!valid} />
    </div>
  )
}
