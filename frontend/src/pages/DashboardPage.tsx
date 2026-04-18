import { motion } from 'framer-motion'
import { stagger, staggerItem } from '@/lib/motion'
import { useDashboard } from '@/features/dashboard/useDashboard'
import { PortfolioSummaryCard } from '@/features/dashboard/PortfolioSummaryCard'
import { HoldingsTable } from '@/features/dashboard/HoldingsTable'
import { PortfolioHistoryChart } from '@/features/dashboard/PortfolioHistoryChart'
import { HoldingsHistoryChart } from '@/features/dashboard/HoldingsHistoryChart'
import { ExportButton } from '@/features/export/ExportButton'
import { downloadHoldings } from '@/api/export'
import { UniversalChart } from '@/components/charts'
import { useCurrency } from '@/contexts/currency-context'
import { formatMoney } from '@/lib/currency'

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

export default function DashboardPage() {
  const { summary, holdings, history, historyRange, setHistoryRange, loading, error } = useDashboard()
  const portfolioCurrency = useCurrency()

  if (loading && !summary) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <ExportButton label="Export Holdings" onDownload={downloadHoldings} />
        </div>
      </div>
      <div className="p-6 space-y-5">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-5"
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

        {/* Portfolio composition donut */}
        {holdings.length > 0 && (
          <motion.div variants={staggerItem} className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Portfolio Composition</h2>
              <UniversalChart
                chartId="dashboard-composition"
                data={holdings.map(h => ({ name: h.symbol, value: h.currentPercent }))}
                defaultType="donut"
                allowedTypes={['donut', 'bar', 'radar']}
                centerValue={formatMoney(summary?.totalValue ?? 0, portfolioCurrency)}
                centerLabel="Total value"
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">By Track</h2>
              <UniversalChart
                chartId="dashboard-by-track"
                data={Object.entries(
                  holdings.reduce<Record<string, number>>((acc, h) => {
                    acc[h.track] = (acc[h.track] ?? 0) + h.currentPercent
                    return acc
                  }, {}),
                ).map(([track, pct]) => ({ name: track, value: pct }))}
                defaultType="donut"
                allowedTypes={['donut', 'bar', 'radar']}
                centerValue={`${holdings.length}`}
                centerLabel="Positions"
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
            </div>
          </motion.div>
        )}

        {/* History chart */}
        <motion.div variants={staggerItem}>
          <PortfolioHistoryChart
            history={history}
            historyRange={historyRange}
            onRangeChange={setHistoryRange}
            loading={loading && !history}
          />
        </motion.div>

        {/* Per-holding price history overlay */}
        <motion.div variants={staggerItem}>
          <HoldingsHistoryChart />
        </motion.div>
      </motion.div>
      </div>
    </div>
  )
}
