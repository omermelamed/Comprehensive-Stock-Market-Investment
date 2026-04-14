import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ScheduleForm } from './ScheduleForm'
import { ScheduleSendHistory } from './ScheduleSendHistory'
import { useWhatsAppSchedules } from './useWhatsAppSchedules'
import type { ScheduledMessage, ScheduledMessageRequest } from '@/api/whatsappSchedules'

const TYPE_LABELS: Record<string, string> = {
  PORTFOLIO_SUMMARY:   'Portfolio Summary',
  PERFORMANCE_REPORT:  'Performance Report',
  ALLOCATION_CHECK:    'Allocation Check',
  INVESTMENT_REMINDER: 'Investment Reminder',
  TOP_MOVERS:          'Top Movers',
}

const TYPE_COLORS: Record<string, string> = {
  PORTFOLIO_SUMMARY:   'bg-primary/15 text-primary',
  PERFORMANCE_REPORT:  'bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))]',
  ALLOCATION_CHECK:    'bg-warning/15 text-warning',
  INVESTMENT_REMINDER: 'bg-success/15 text-success',
  TOP_MOVERS:          'bg-destructive/15 text-destructive',
}

function frequencyLabel(s: ScheduledMessage): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (s.frequency === 'WEEKLY') {
    const day = s.dayOfWeek != null ? days[s.dayOfWeek] : '?'
    return `Weekly · ${day} @ ${s.sendTime}`
  }
  if (s.frequency === 'BIWEEKLY') {
    const day = s.dayOfWeek != null ? days[s.dayOfWeek] : '?'
    return `Bi-weekly (wk ${s.biweeklyWeek ?? '?'}) · ${day} @ ${s.sendTime}`
  }
  return `Monthly · Day ${s.dayOfMonth ?? '?'} @ ${s.sendTime}`
}

export function ScheduledMessagesList() {
  const { schedules, loading, error, create, update, toggle, remove, fetchHistory } =
    useWhatsAppSchedules()

  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<ScheduledMessage | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm]     = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleCreate(req: ScheduledMessageRequest) {
    setSubmitting(true)
    try {
      await create(req)
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate(req: ScheduledMessageRequest) {
    if (!editing) return
    setSubmitting(true)
    try {
      await update(editing.id, req)
      setEditing(null)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setActionError(null)
    try {
      await toggle(id, !current)
    } catch {
      setActionError('Failed to toggle schedule')
    }
  }

  async function handleDelete(id: string) {
    setActionError(null)
    try {
      await remove(id)
      setDeleteConfirm(null)
    } catch {
      setActionError('Failed to delete schedule')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Create form */}
      {showForm && !editing && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">New Scheduled Message</h3>
            <ScheduleForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              submitting={submitting}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {schedules.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted-foreground">No scheduled messages yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            Add your first schedule
          </button>
        </div>
      )}

      {/* Schedule rows */}
      {schedules.map(s => (
        <Card key={s.id} className={s.isActive ? '' : 'opacity-60'}>
          <CardContent className="p-5">
            {editing?.id === s.id ? (
              <>
                <h3 className="mb-4 text-sm font-semibold text-foreground">Edit Schedule</h3>
                <ScheduleForm
                  initial={editing}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditing(null)}
                  submitting={submitting}
                />
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          TYPE_COLORS[s.messageType] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {TYPE_LABELS[s.messageType] ?? s.messageType}
                      </span>
                      {!s.isActive && (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 font-medium text-foreground">{s.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{frequencyLabel(s)}</p>
                    <div className="mt-1.5 flex gap-4 text-xs text-muted-foreground">
                      <span>
                        Next:{' '}
                        <span className="text-foreground">
                          {new Date(s.nextSendAt).toLocaleString()}
                        </span>
                      </span>
                      {s.lastSentAt && (
                        <span>
                          Last sent:{' '}
                          <span className="text-foreground">
                            {new Date(s.lastSentAt).toLocaleString()}
                          </span>
                        </span>
                      )}
                      <span>Sent {s.sendCount}×</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {/* Active toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={s.isActive}
                      onClick={() => void handleToggle(s.id, s.isActive)}
                      title={s.isActive ? 'Pause' : 'Resume'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        s.isActive ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-background shadow ring-0 transition-transform ${
                          s.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => setEditing(s)}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                    >
                      Edit
                    </button>

                    {deleteConfirm === s.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => void handleDelete(s.id)}
                          className="rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(s.id)}
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* History expand */}
                <div className="mt-3 border-t border-border pt-3">
                  <button
                    onClick={() =>
                      setExpandedHistory(prev => (prev === s.id ? null : s.id))
                    }
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span
                      className={`inline-block transition-transform ${
                        expandedHistory === s.id ? 'rotate-90' : ''
                      }`}
                    >
                      ▶
                    </span>
                    Send history
                  </button>

                  {expandedHistory === s.id && (
                    <div className="mt-2">
                      <ScheduleSendHistory
                        scheduleId={s.id}
                        fetchHistory={fetchHistory}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add button when list is non-empty */}
      {schedules.length > 0 && !showForm && !editing && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          + Add scheduled message
        </button>
      )}
    </div>
  )
}
