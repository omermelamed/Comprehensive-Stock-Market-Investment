import { Button } from '@/components/ui/button'

interface StepFooterProps {
  onContinue: () => void
  onBack?: () => void
  continueLabel?: string
  disabled?: boolean
}

export function StepFooter({ onContinue, onBack, continueLabel = 'Continue', disabled }: StepFooterProps) {
  return (
    <div className="mt-7 flex items-center justify-center gap-3">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="px-6">
          ← Back
        </Button>
      )}
      <Button onClick={onContinue} disabled={disabled} className="px-10">
        {continueLabel} <span>→</span>
      </Button>
    </div>
  )
}
