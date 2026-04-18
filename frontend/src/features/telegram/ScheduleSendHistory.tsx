import { useEffect, useState } from 'react'
import type { ScheduledMessageLogEntry } from '@/api/telegramSchedules'

interface Props {
  scheduleId: string
  fetchHistory: (id: string) => Promise<ScheduledMessageLogEntry[]>
}

export function ScheduleSendHistory({ scheduleId, fetchHistory }: Props) {
  const [entries, setEntries] = useState<ScheduledMessageLogEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchHistory(scheduleId)
      .then(setEntries)
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false))
  }, [scheduleId, fetchHistory])

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="py-2 text-xs text-destructive">{error}</p>
  }

  if (!entries || entries.length === 0) {
    return <p className="py-2 text-xs text-muted-foreground">No sends yet.</p>
  }

  return (
    <div className="space-y-1.5">
      {entries.map(e => (
        <div
          key={e.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs"
        >
          <div className="min-w-0">
            <p className="font-mono text-foreground">{new Date(e.sentAt).toLocaleString()}</p>
            {e.errorMessage && (
              <p className="mt-0.5 truncate text-destructive">{e.errorMessage}</p>
            )}
            {e.telegramMessageId && (
              <p className="mt-0.5 truncate text-muted-foreground">Msg ID: {e.telegramMessageId}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 font-semibold uppercase ${
              e.status === 'SENT'
                ? 'bg-success/15 text-success'
                : 'bg-destructive/15 text-destructive'
            }`}
          >
            {e.status}
          </span>
        </div>
      ))}
    </div>
  )
}
