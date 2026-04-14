import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/shared/section-header'
import { ASSET_TRACKS } from '@/data/onboarding'
import type { OnboardingData } from '@/features/onboarding/useOnboarding'

interface StepReviewProps {
  data: Partial<OnboardingData>
  onSubmit: () => void
  onBack: () => void
  submitting: boolean
  error: string | null
}

export function StepReview({ data, onSubmit, onBack, submitting, error }: StepReviewProps) {
  const trackLabels = (data.tracksEnabled ?? [])
    .map(v => ASSET_TRACKS.find(t => t.value === v)?.label ?? v)
    .join(', ')

  const whatsappStatus = data.whatsappNumber
    ? (data.whatsappEnabled ? `${data.whatsappNumber} (enabled)` : `${data.whatsappNumber} (disabled)`)
    : 'Not configured'

  const rows = [
    { icon: '👤', label: data.displayName ?? '—' },
    { icon: '€',  label: data.preferredCurrency ?? '—' },
    ...(data.timeHorizonYears ? [{ icon: '🗓', label: `${data.timeHorizonYears} yrs` }] : []),
    ...(data.monthlyInvestmentMin ? [{ icon: '💰', label: `$${data.monthlyInvestmentMin.toLocaleString()}/mo` }] : []),
    ...(trackLabels ? [{ icon: '📊', label: trackLabels }] : []),
    ...(data.timezone ? [{ icon: '🌐', label: data.timezone.replace(/_/g, ' ') }] : []),
    { icon: '💬', label: whatsappStatus },
  ]

  return (
    <div>
      <SectionHeader title="You're all set 👌" className="text-center" />

      <div className="mb-6 space-y-2">
        {rows.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="flex items-center justify-between rounded-xl border border-input bg-muted/30 px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">{row.icon}</span>
              <span className="text-sm font-medium">{row.label}</span>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28, delay: i * 0.05 + 0.08 }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10"
            >
              <Check className="h-3 w-3 text-success" strokeWidth={3} />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          ← Back
        </Button>
        <Button
          onClick={!submitting ? onSubmit : undefined}
          disabled={submitting}
          className="px-8"
        >
          {submitting ? 'Setting up…' : 'Start using the app →'}
        </Button>
      </div>
    </div>
  )
}
