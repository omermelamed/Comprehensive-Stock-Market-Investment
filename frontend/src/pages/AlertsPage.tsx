import { useSearchParams } from 'react-router-dom'
import { Bell, Trash2, RefreshCw, CheckCheck } from 'lucide-react'
import { useAlerts } from '@/features/alerts/useAlerts'
import { CreateAlertForm } from '@/features/alerts/CreateAlertForm'
import type { Alert } from '@/types'

function conditionBadge(condition: 'ABOVE' | 'BELOW') {
  if (condition === 'ABOVE') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold text-[hsl(var(--chart-2))] bg-[hsl(var(--chart-2))]/10">
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
    WHATSAPP: 'WhatsApp',
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
  onDelete: (id: string) => void
}

function ActiveAlertsTable({ alerts, onDelete }: ActiveAlertsTableProps) {
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
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Symbol</th>
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Condition</th>
            <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Threshold</th>
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground pl-4">Note</th>
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground pl-4">Source</th>
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground pl-4">Created</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {alerts.map(a => (
            <tr key={a.id} className="border-b border-border/50 last:border-0">
              <td className="py-2.5 font-mono font-semibold text-foreground">{a.symbol}</td>
              <td className="py-2.5">{conditionBadge(a.condition)}</td>
              <td className="py-2.5 text-right font-mono text-foreground">
                ${a.thresholdPrice.toFixed(2)}
              </td>
              <td className="py-2.5 pl-4 text-muted-foreground max-w-[180px] truncate">
                {a.note ?? '—'}
              </td>
              <td className="py-2.5 pl-4">{sourceBadge(a.source)}</td>
              <td className="py-2.5 pl-4 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(a.createdAt)}
              </td>
              <td className="py-2.5 text-right">
                <button
                  onClick={() => onDelete(a.id)}
                  className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                  title="Delete alert"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Symbol</th>
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Condition</th>
            <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Threshold</th>
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground pl-4">Triggered At</th>
            <th className="pb-2" />
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
                  isUnread ? 'bg-[hsl(var(--warning))]/5 border-l-2 border-l-[hsl(var(--warning))]' : '',
                ].join(' ')}
              >
                <td className="py-2.5 pl-2 font-mono font-semibold text-foreground">
                  {a.symbol}
                  {isUnread && (
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--warning))] align-middle" />
                  )}
                </td>
                <td className="py-2.5">{conditionBadge(a.condition)}</td>
                <td className="py-2.5 text-right font-mono text-foreground">
                  ${a.thresholdPrice.toFixed(2)}
                </td>
                <td className="py-2.5 pl-4 text-xs text-muted-foreground whitespace-nowrap">
                  {a.triggeredAt ? formatDate(a.triggeredAt) : '—'}
                </td>
                <td className="py-2.5 text-right">
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

  const {
    active,
    triggered,
    unreadCount,
    isLoading,
    createAlert,
    deleteAlert,
    dismissAlert,
    dismissAll,
    reEnableAlert,
  } = useAlerts()

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Alerts</h1>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Set price alerts and review triggered notifications.
        </p>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-8">

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
                  <ActiveAlertsTable alerts={active} onDelete={deleteAlert} />

                  <div className="mt-5 border-t border-border pt-5">
                    <p className="mb-3 text-sm font-medium text-foreground">Create new alert</p>
                    <CreateAlertForm defaultSymbol={defaultSymbol} onSubmit={createAlert} />
                  </div>
                </div>
              </section>

              {/* Triggered Alerts */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">Triggered Alerts</h2>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                        {unreadCount} new
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
