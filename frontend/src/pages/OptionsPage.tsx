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
      <div className="p-6 space-y-5">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  // Gate: options track not enabled
  if (!optionsEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center p-6">
        <Layers className="mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Options Track Not Enabled</p>
        <p className="mt-1 text-xs text-muted-foreground/60 max-w-md">
          Enable the Options track in your profile to start tracking options positions and get AI strategy suggestions.
        </p>
        <Link
          to="/profile"
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Profile
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  const activePositions = positions.filter(p => p.status === 'ACTIVE')
  const closedPositions = positions.filter(p => p.status !== 'ACTIVE')

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Options</h1>
          </div>
          <Link
            to="/options/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Position
          </Link>
        </div>
      </div>
      <div className="p-6">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
          {/* Active positions */}
          <motion.div variants={staggerItem}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
                className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
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
    </div>
  )
}
