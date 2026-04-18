import { useEffect, useState } from 'react'
import type { MessageType, Frequency, ScheduledMessage, ScheduledMessageRequest } from '@/api/telegramSchedules'

const MESSAGE_TYPES: { value: MessageType; label: string }[] = [
  { value: 'PORTFOLIO_SUMMARY',  label: 'Portfolio Summary' },
  { value: 'PERFORMANCE_REPORT', label: 'Performance Report' },
  { value: 'ALLOCATION_CHECK',   label: 'Allocation Check' },
  { value: 'INVESTMENT_REMINDER',label: 'Investment Reminder' },
  { value: 'TOP_MOVERS',         label: 'Top Movers' },
]

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'block text-sm font-medium text-muted-foreground mb-1.5'

interface Props {
  initial?: ScheduledMessage | null
  onSubmit: (req: ScheduledMessageRequest) => Promise<void>
  onCancel: () => void
  submitting?: boolean
}

export function ScheduleForm({ initial, onSubmit, onCancel, submitting }: Props) {
  const [messageType, setMessageType] = useState<MessageType>(initial?.messageType ?? 'PORTFOLIO_SUMMARY')
  const [label, setLabel]             = useState(initial?.label ?? '')
  const [frequency, setFrequency]     = useState<Frequency>(initial?.frequency ?? 'WEEKLY')
  const [dayOfWeek, setDayOfWeek]     = useState<number>(initial?.dayOfWeek ?? 1)
  const [biweeklyWeek, setBiweeklyWeek] = useState<number>(initial?.biweeklyWeek ?? 1)
  const [dayOfMonth, setDayOfMonth]   = useState<number>(initial?.dayOfMonth ?? 1)
  const [sendTime, setSendTime]       = useState(initial?.sendTime ?? '08:00')
  const [formError, setFormError]     = useState<string | null>(null)

  useEffect(() => {
    if (!initial && !label) {
      const found = MESSAGE_TYPES.find(m => m.value === messageType)
      if (found) setLabel(found.label)
    }
  }, [messageType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!label.trim()) { setFormError('Label is required'); return }

    const req: ScheduledMessageRequest = {
      messageType,
      label: label.trim(),
      frequency,
      dayOfWeek:    (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') ? dayOfWeek : null,
      biweeklyWeek: frequency === 'BIWEEKLY' ? biweeklyWeek : null,
      dayOfMonth:   frequency === 'MONTHLY' ? dayOfMonth : null,
      sendTime,
    }

    try {
      await onSubmit(req)
    } catch {
      setFormError('Failed to save schedule. Please try again.')
    }
  }

  return (
    <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
      <div>
        <label className={labelClass}>Message Type</label>
        <select
          className={inputClass}
          value={messageType}
          onChange={e => setMessageType(e.target.value as MessageType)}
        >
          {MESSAGE_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Label</label>
        <input
          type="text"
          className={inputClass}
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Weekly Sunday Summary"
          maxLength={80}
        />
      </div>

      <div>
        <label className={labelClass}>Frequency</label>
        <div className="flex gap-2">
          {(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as Frequency[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                frequency === f
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {f === 'BIWEEKLY' ? 'Bi-weekly' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {(frequency === 'WEEKLY' || frequency === 'BIWEEKLY') && (
        <div>
          <label className={labelClass}>Day of Week</label>
          <select
            className={inputClass}
            value={dayOfWeek}
            onChange={e => setDayOfWeek(Number(e.target.value))}
          >
            {DAYS_OF_WEEK.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {frequency === 'BIWEEKLY' && (
        <div>
          <label className={labelClass}>Week Cycle</label>
          <div className="flex gap-2">
            {[1, 2].map(w => (
              <button
                key={w}
                type="button"
                onClick={() => setBiweeklyWeek(w)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  biweeklyWeek === w
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                Week {w} {w === 1 ? '(odd ISO weeks)' : '(even ISO weeks)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {frequency === 'MONTHLY' && (
        <div>
          <label className={labelClass}>Day of Month</label>
          <select
            className={inputClass}
            value={dayOfMonth}
            onChange={e => setDayOfMonth(Number(e.target.value))}
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}>Send Time</label>
        <input
          type="time"
          className={inputClass}
          value={sendTime}
          onChange={e => setSendTime(e.target.value)}
        />
      </div>

      {formError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Saving…' : initial ? 'Update Schedule' : 'Create Schedule'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
