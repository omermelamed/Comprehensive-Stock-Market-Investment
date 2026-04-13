import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { stagger, staggerItem } from '@/lib/motion'
import { useOptions } from '@/features/options/useOptions'
import { OptionsPositionsTable } from '@/features/options/OptionsPositionsTable'

export default function OptionsPage() {
  const { positions, isLoading, optionsEnabled, error, updateStatus, deletePosition } = useOptions()
  const [closedExpanded, setClosedExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  // Gate: options track not enabled
  if (!optionsEnabled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
        <Layers className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">Options Track Not Enabled</h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Enable the Options track in your profile to start tracking options positions and get AI strategy suggestions.
        </p>
        <Link
          to="/profile"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go to Profile
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  const activePositions = positions.filter(p => p.status === 'ACTIVE')
  const closedPositions = positions.filter(p => p.status !== 'ACTIVE')

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Options</h1>
        </div>
        <Link
          to="/options/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Position
        </Link>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        {/* Active positions */}
        <motion.div variants={staggerItem}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Active ({activePositions.length})
          </h2>
          <OptionsPositionsTable
            positions={activePositions}
            onUpdateStatus={updateStatus}
            onDelete={deletePosition}
          />
        </motion.div>

        {/* Closed positions (collapsible) */}
        {closedPositions.length > 0 && (
          <motion.div variants={staggerItem}>
            <button
              onClick={() => setClosedExpanded(v => !v)}
              className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {closedExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Closed / Expired / Exercised ({closedPositions.length})
            </button>

            {closedExpanded && (
              <OptionsPositionsTable
                positions={closedPositions}
                onUpdateStatus={updateStatus}
                onDelete={deletePosition}
              />
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
