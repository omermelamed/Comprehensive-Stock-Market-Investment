import { motion } from 'framer-motion'
import { stagger, staggerItem } from '@/lib/motion'
import { useDashboard } from '@/features/dashboard/useDashboard'
import { PortfolioSummaryCard } from '@/features/dashboard/PortfolioSummaryCard'
import { HoldingsTable } from '@/features/dashboard/HoldingsTable'
import { PortfolioHistoryChart } from '@/features/dashboard/PortfolioHistoryChart'
import { ExportButton } from '@/features/export/ExportButton'
import { downloadHoldings } from '@/api/export'

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}

export default function DashboardPage() {
  const { summary, holdings, history, historyRange, setHistoryRange, loading, error } = useDashboard()

  if (loading && !summary) {
    return (
      <div className="p-8">
        <DashboardSkeleton />
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="p-8">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <ExportButton label="Export Holdings" onDownload={downloadHoldings} />
      </div>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Summary card */}
        <motion.div variants={staggerItem}>
          {summary ? (
            <PortfolioSummaryCard summary={summary} />
          ) : (
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          )}
        </motion.div>

        {/* Holdings table */}
        <motion.div variants={staggerItem}>
          <HoldingsTable holdings={holdings} />
        </motion.div>

        {/* History chart */}
        <motion.div variants={staggerItem}>
          <PortfolioHistoryChart
            history={history}
            historyRange={historyRange}
            onRangeChange={setHistoryRange}
            loading={loading && !history}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
