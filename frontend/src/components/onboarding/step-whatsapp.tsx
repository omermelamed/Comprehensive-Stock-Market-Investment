import { useRef, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/shared/section-header'
import { StepFooter } from './step-footer'

interface StepWhatsAppProps {
  value: string
  onValueChange: (v: string) => void
  onContinue: () => void
  onBack?: () => void
}

// Loose validation: must start with + and have at least 7 digits
function isValidPhone(v: string) {
  return /^\+\d{7,15}$/.test(v.trim())
}

export function StepWhatsApp({ value, onValueChange, onContinue, onBack }: StepWhatsAppProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const valid = isValidPhone(value)
  const canSkip = value.trim() === ''

  return (
    <div>
      <SectionHeader
        title="WhatsApp notifications"
        description="Get a summary on WhatsApp every time you confirm a monthly investment."
      />

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D36615] text-[#25D366]">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="text-xs text-muted-foreground">
          Messages are sent from Twilio's WhatsApp number. Enter your number in international
          format, e.g. <span className="font-mono text-foreground">+972501234567</span>
        </div>
      </div>

      <Input
        ref={inputRef}
        value={value}
        onChange={e => onValueChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && (valid || canSkip) && onContinue()}
        placeholder="+972501234567"
        type="tel"
        aria-label="WhatsApp phone number"
      />

      {value.trim() !== '' && !valid && (
        <p className="mt-2 text-xs text-destructive">
          Use international format starting with +, e.g. +972501234567
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Optional — you can skip this and add it later in Settings.
      </p>

      <StepFooter
        onContinue={onContinue}
        onBack={onBack}
        disabled={value.trim() !== '' && !valid}
        continueLabel={canSkip ? 'Skip' : 'Continue'}
      />
    </div>
  )
}
