import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, Trash2, RefreshCw, CheckCheck, Pencil } from 'lucide-react'
import { useAlerts, type CreateAlertData } from '@/features/alerts/useAlerts'
import { CreateAlertForm } from '@/features/alerts/CreateAlertForm'
import type { Alert } from '@/types'

function conditionBadge(condition: 'ABOVE' | 'BELOW') {
  if (condition === 'ABOVE') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10">
        ABOVE
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold text-destructive bg-destructive/10">
      BELOW
    </span>
  )
}

function sourceBadge(source: string) {
  const labels: Record<string, string> = {
    APP: 'App',
    CHATBOT: 'Chatbot',
    TELEGRAM: 'Telegram',
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted">
      {labels[source] ?? source}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ActiveAlertsTableProps {
  alerts: Alert[]
  onEdit: (alert: Alert) => void
  onDelete: (id: string) => void
}

function ActiveAlertsTable({ alerts, onEdit, onDelete }: ActiveAlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No active alerts — create one below.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Symbol</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Threshold</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Note</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {alerts.map(a => (
            <tr key={a.id} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-3 font-mono font-semibold text-foreground">{a.symbol}</td>
              <td className="px-4 py-3">{conditionBadge(a.condition)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-mono text-sm text-foreground">
                ${a.thresholdPrice.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate text-sm">
                {a.note ?? '—'}
              </td>
              <td className="px-4 py-3">{sourceBadge(a.source)}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(a.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => onEdit(a)}
                    className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                    title="Edit alert"
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(a.id)}
                    className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                    title="Delete alert"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface TriggeredAlertsTableProps {
  alerts: Alert[]
  onDismiss: (id: string) => void
  onReEnable: (id: string) => void
}

function TriggeredAlertsTable({ alerts, onDismiss, onReEnable }: TriggeredAlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No triggered alerts yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Symbol</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Threshold</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Triggered At</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {alerts.map(a => {
            const isUnread = a.dismissedAt === null
            return (
              <tr
                key={a.id}
                className={[
                  'border-b border-border/50 last:border-0',
                  isUnread ? 'bg-warning/5 border-l-2 border-l-warning' : '',
                ].join(' ')}
              >
                <td className="px-4 py-3 font-mono font-semibold text-foreground">
                  {a.symbol}
                  {isUnread && (
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warning align-middle" />
                  )}
                </td>
                <td className="px-4 py-3">{conditionBadge(a.condition)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-mono text-sm text-foreground">
                  ${a.thresholdPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {a.triggeredAt ? formatDate(a.triggeredAt) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isUnread && (
                      <button
                        onClick={() => onDismiss(a.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Dismiss"
                      >
                        Dismiss
                      </button>
                    )}
                    <button
                      onClick={() => onReEnable(a.id)}
                      className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                      title="Re-enable alert"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function AlertsPage() {
  const [searchParams] = useSearchParams()
  const defaultSymbol = searchParams.get('symbol') ?? undefined
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)

  const {
    active,
    triggered,
    unreadCount,
    isLoading,
    createAlert,
    updateAlert,
    deleteAlert,
    dismissAlert,
    dismissAll,
    reEnableAlert,
  } = useAlerts()

  async function handleAlertFormSubmit(data: CreateAlertData) {
    if (editingAlert) {
      await updateAlert(editingAlert.id, data)
    } else {
      await createAlert(data)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Alerts</h1>
          </div>
          {unreadCount > 0 && (
            <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-semibold text-destructive">
              {unreadCount} new
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-5">

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg border border-border bg-card" />
              ))}
            </div>
          )}

          {!isLoading && (
            <>
              {/* Active Alerts */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Active Alerts</h2>
                  <span className="text-xs text-muted-foreground">
                    {active.length} {active.length === 1 ? 'alert' : 'alerts'}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <ActiveAlertsTable
                    alerts={active}
                    onEdit={a => {
                      setEditingAlert(a)
                    }}
                    onDelete={deleteAlert}
                  />

                  <div className="mt-5 border-t border-border pt-5">
                    <p className="mb-3 text-sm font-medium text-foreground">
                      {editingAlert ? 'Edit alert' : 'Create new alert'}
                    </p>
                    <CreateAlertForm
                      defaultSymbol={editingAlert ? undefined : defaultSymbol}
                      editAlert={editingAlert}
                      onCancelEdit={() => setEditingAlert(null)}
                      onSubmit={handleAlertFormSubmit}
                    />
                  </div>
                </div>
              </section>

              {/* Triggered Alerts */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">Triggered Alerts</h2>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-semibold text-destructive">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={dismissAll}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Dismiss all
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <TriggeredAlertsTable
                    alerts={triggered}
                    onDismiss={dismissAlert}
                    onReEnable={reEnableAlert}
                  />
                </div>
              </section>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
