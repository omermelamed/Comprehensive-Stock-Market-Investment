import { Link } from 'react-router-dom'
import { Plus, TrendingUp } from 'lucide-react'
import { useOptions } from '../features/options/useOptions'
import { OptionsPositionsTable } from '../features/options/OptionsPositionsTable'

export default function OptionsPage() {
  const { data, loading, error, closePosition, remove } = useOptions()

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted/40" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-sm text-destructive">{error}</div>
    )
  }

  if (!data?.optionsTrackEnabled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Options track not enabled</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Enable the OPTIONS track in your profile settings to start tracking options positions.
        </p>
        <Link
          to="/profile"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Go to Profile
        </Link>
      </div>
    )
  }

  const active = data.positions.filter(p => p.status === 'ACTIVE')
  const closed = data.positions.filter(p => p.status !== 'ACTIVE')

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Options</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track options positions alongside your equity holdings.
          </p>
        </div>
        <Link
          to="/options/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Log Position
        </Link>
      </div>

      {/* Summary chips */}
      {data.positions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-2">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-bold">{active.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-2">
            <p className="text-xs text-muted-foreground">Expiring ≤7d</p>
            <p className="text-lg font-bold text-destructive">
              {active.filter(p => p.daysToExpiry <= 7).length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-2">
            <p className="text-xs text-muted-foreground">Total Premium At Risk</p>
            <p className="text-lg font-bold">
              ${active.reduce((s, p) => s + p.totalPremium, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Active positions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Active Positions
        </h2>
        <OptionsPositionsTable
          positions={active}
          onClose={closePosition}
          onDelete={remove}
        />
      </section>

      {/* Closed / historical */}
      {closed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Closed / Historical
          </h2>
          <OptionsPositionsTable
            positions={closed}
            onClose={closePosition}
            onDelete={remove}
          />
        </section>
      )}
    </div>
  )
}
