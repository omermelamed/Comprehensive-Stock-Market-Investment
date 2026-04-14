import { useEffect, useRef } from 'react'
import { Globe } from 'lucide-react'
import { SectionHeader } from '@/components/shared/section-header'
import { StepFooter } from './step-footer'

// Curated list of common IANA timezones covering most users worldwide
const COMMON_TIMEZONES = [
  // Americas
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'America/Bogota',
  'America/Mexico_City',
  'America/Toronto',
  'America/Vancouver',
  // Europe
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'Europe/Stockholm',
  'Europe/Warsaw',
  'Europe/Athens',
  'Europe/Istanbul',
  // Middle East / Africa
  'Asia/Jerusalem',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Africa/Cairo',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  // Asia / Pacific
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  // UTC
  'UTC',
]

function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return COMMON_TIMEZONES.includes(tz) ? tz : 'UTC'
  } catch {
    return 'UTC'
  }
}

function formatTimezone(tz: string): string {
  try {
    const now = new Date()
    const offset = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(now)
      .find(p => p.type === 'timeZoneName')?.value ?? ''
    return `${tz.replace(/_/g, ' ')} (${offset})`
  } catch {
    return tz
  }
}

interface StepTimezoneProps {
  value: string
  onValueChange: (v: string) => void
  onContinue: () => void
  onBack?: () => void
}

export function StepTimezone({ value, onValueChange, onContinue, onBack }: StepTimezoneProps) {
  const selectRef = useRef<HTMLSelectElement>(null)

  // Default to browser timezone on first render if value is empty
  useEffect(() => {
    if (!value) {
      onValueChange(getBrowserTimezone())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <SectionHeader
        title="Your timezone"
        description="Used for scheduled notifications and daily portfolio snapshots."
      />

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Globe className="h-4 w-4" />
        </div>
        <p className="text-xs text-muted-foreground">
          We detected <span className="font-mono text-foreground">{getBrowserTimezone()}</span> from your
          browser. Change it below if needed.
        </p>
      </div>

      <select
        ref={selectRef}
        value={value || getBrowserTimezone()}
        onChange={e => onValueChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {COMMON_TIMEZONES.map(tz => (
          <option key={tz} value={tz}>
            {formatTimezone(tz)}
          </option>
        ))}
      </select>

      <StepFooter onContinue={onContinue} onBack={onBack} />
    </div>
  )
}
