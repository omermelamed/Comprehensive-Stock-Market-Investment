import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { stagger, staggerItem } from '@/lib/motion'
import { useDashboard } from '@/features/dashboard/useDashboard'
import { PortfolioSummaryCard } from '@/features/dashboard/PortfolioSummaryCard'
import { HoldingsTable } from '@/features/dashboard/HoldingsTable'
import { PortfolioHistoryChart } from '@/features/dashboard/PortfolioHistoryChart'
import { PortfolioSparklineSummary } from '@/features/dashboard/PortfolioSparklineSummary'
import { ExportButton } from '@/features/export/ExportButton'
import { downloadHoldings } from '@/api/export'
import { UniversalChart } from '@/components/charts'
import { SellPanel } from '@/features/sell/SellPanel'
import { SellToast } from '@/features/sell/SellToast'
import { RecalculationBanner } from '@/features/sell/RecalculationBanner'
import { StaleDataOverlay } from '@/features/sell/StaleDataOverlay'
import { useRecalculation } from '@/features/sell/useRecalculation'
import type { SellResult } from '@/api/sell'
import { BriefingWidget } from '@/features/briefing/BriefingWidget'

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
  const { summary, holdings, history, historyRange, setHistoryRange, loading, error, refresh } = useDashboard()
  const [sellSymbol, setSellSymbol] = useState<string | null>(null)
  const [sellResult, setSellResult] = useState<SellResult | null>(null)
  const { status: recalcStatus, isRunning, isFailed, justCompleted, startPolling, retry } = useRecalculation()

  const handleSell = useCallback((symbol: string) => {
    setSellSymbol(symbol)
  }, [])

  const handleSellComplete = useCallback((result: SellResult) => {
    setSellResult(result)
    setSellSymbol(null)
    refresh()
    startPolling()
  }, [refresh, startPolling])

  const handleSellClose = useCallback(() => {
    setSellSymbol(null)
  }, [])

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
      <RecalculationBanner
        status={recalcStatus}
        isRunning={isRunning}
        isFailed={isFailed}
        justCompleted={justCompleted}
        onRetry={retry}
      />
      <div className="p-6 space-y-5">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        {/* Daily briefing widget */}
        <motion.div variants={staggerItem}>
          <BriefingWidget />
        </motion.div>

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
          <HoldingsTable holdings={holdings} onSell={handleSell} />
        </motion.div>

        {/* Portfolio composition donut */}
        {holdings.length > 0 && (
          <motion.div variants={staggerItem} className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Portfolio Composition</h2>
              <UniversalChart
                chartId="dashboard-composition"
                data={holdings.map(h => ({ name: h.symbol, value: h.currentPercent }))}
                defaultType={holdings.length > 8 ? 'bar' : 'donut'}
                allowedTypes={['bar', 'donut']}
                formatCenterValue={(t) => `${t.toFixed(1)}%`}
                centerLabel="Of portfolio"
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
                allowedTypes={['donut', 'bar']}
                formatCenterValue={(_, count) => `${count}`}
                centerLabel="Tracks"
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
            </div>
          </motion.div>
        )}

        {/* History chart */}
        <motion.div variants={staggerItem} className="relative">
          <PortfolioHistoryChart
            history={history}
            historyRange={historyRange}
            onRangeChange={setHistoryRange}
            loading={loading && !history}
          />
          <StaleDataOverlay visible={isRunning} sellDate={recalcStatus?.sellDate} />
        </motion.div>

        {/* Compact portfolio trend + link to Analytics (per-holding chart lives there) */}
        <motion.div variants={staggerItem} className="relative">
          <PortfolioSparklineSummary
            history={history}
            historyRange={historyRange}
            loading={loading && !history}
          />
          <StaleDataOverlay visible={isRunning} sellDate={recalcStatus?.sellDate} />
        </motion.div>
      </motion.div>
      </div>

      {/* Sell panel */}
      <SellPanel
        symbol={sellSymbol}
        onClose={handleSellClose}
        onComplete={handleSellComplete}
      />

      {/* Sell toast */}
      <SellToast result={sellResult} onDismiss={() => setSellResult(null)} />
    </div>
  )
}
