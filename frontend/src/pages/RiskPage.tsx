import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { stagger, staggerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import {
  getRiskMetrics,
  getRiskWarnings,
  getRiskThresholds,
  updateRiskThresholds,
  type RiskMetrics,
  type RiskWarningsResponse,
  type RiskThresholds,
} from '@/api/risk'
import { useRiskProfile } from '@/features/risk/useRiskProfile'
import { RiskProfileCard } from '@/features/risk/RiskProfileCard'
import { RiskReasoningPanel } from '@/features/risk/RiskReasoningPanel'
import { RiskScoreHistory } from '@/features/risk/RiskScoreHistory'
import { RadarChartComponent, UniversalChart } from '@/components/charts'

function fmtPct(v: number | null): string {
  if (v === null) return '—'
  return `${v.toFixed(2)}%`
}

function fmtDecimal(v: number | null, places = 2): string {
  if (v === null) return '—'
  return v.toFixed(places)
}

function RiskSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-28 animate-pulse rounded-xl bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

const STATUS_COLORS = {
  ON_TARGET: 'bg-success/15 text-success',
  UNDERWEIGHT: 'bg-warning/15 text-warning',
  OVERWEIGHT: 'bg-destructive/15 text-destructive',
}

export default function RiskPage() {
  const {
    current,
    history: riskHistory,
    loading: profileLoading,
    evaluating,
    evaluate,
  } = useRiskProfile()

  const [metrics, setMetrics] = useState<RiskMetrics | null>(null)
  const [warnings, setWarnings] = useState<RiskWarningsResponse | null>(null)
  const [thresholds, setThresholds] = useState<RiskThresholds | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Thresholds edit state
  const [editingThresholds, setEditingThresholds] = useState<Partial<RiskThresholds>>({})
  const [savingThresholds, setSavingThresholds] = useState(false)
  const [thresholdSaveError, setThresholdSaveError] = useState<string | null>(null)
  const [thresholdSaved, setThresholdSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getRiskMetrics(), getRiskWarnings(), getRiskThresholds()])
      .then(([m, w, t]) => {
        if (cancelled) return
        setMetrics(m)
        setWarnings(w)
        setThresholds(t)
        setEditingThresholds({
          maxSinglePositionPct: t.maxSinglePositionPct,
          maxSectorPct: t.maxSectorPct,
          maxDrawdownPct: t.maxDrawdownPct,
          driftWarningPct: t.driftWarningPct,
          rebalanceReminderDays: t.rebalanceReminderDays,
        })
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load risk data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const handleSaveThresholds = async () => {
    setSavingThresholds(true)
    setThresholdSaveError(null)
    setThresholdSaved(false)
    try {
      const updated = await updateRiskThresholds(editingThresholds)
      setThresholds(updated)
      setThresholdSaved(true)
      setTimeout(() => setThresholdSaved(false), 3000)
    } catch (err) {
      setThresholdSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingThresholds(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <RiskSkeleton />
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

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Risk Dashboard</h1>
        </div>
      </div>
      <div className="p-6">
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
        {/* Risk Profile */}
        <motion.div variants={staggerItem} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Risk Profile</h2>
          {profileLoading ? (
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
          ) : (
            <>
              <RiskProfileCard current={current} evaluating={evaluating} onEvaluate={evaluate} />
              <RiskReasoningPanel reasoning={current?.reasoning} />
              <RiskScoreHistory history={riskHistory} />
            </>
          )}
        </motion.div>

        {/* Warnings */}
        <motion.div variants={staggerItem}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Warnings</h2>
          {warnings && warnings.warnings.length > 0 ? (
            <div className="space-y-2">
              {warnings.warnings.map((w, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
                    w.severity === 'ERROR' && 'border-destructive/30 bg-destructive/10 text-destructive',
                    w.severity === 'WARNING' && 'border-warning/30 bg-warning/10 text-warning',
                    w.severity === 'INFO' && 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {w.severity === 'ERROR' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  {w.severity === 'WARNING' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                  {w.severity === 'INFO' && <Info className="mt-0.5 h-4 w-4 shrink-0" />}
                  <div>
                    <span>{w.message}</span>
                    {w.symbol && <span className="ml-1 font-mono font-semibold">({w.symbol})</span>}
                    {w.currentValue !== undefined && w.thresholdValue !== undefined && (
                      <span className="ml-2 text-xs opacity-70">
                        {fmtPct(w.currentValue)} / {fmtPct(w.thresholdValue)} limit
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {warnings.daysSinceRebalance !== null && (
                <p className="text-xs text-muted-foreground">
                  Last rebalance: {warnings.lastRebalanceDate ?? 'never'}
                  {warnings.daysSinceRebalance !== null && ` (${warnings.daysSinceRebalance} days ago)`}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              No active risk warnings.
            </div>
          )}
        </motion.div>

        {/* Risk stats row + radar */}
        {metrics && (
          <motion.div variants={staggerItem} className="grid gap-5 md:grid-cols-[1fr_280px]">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Portfolio Beta', value: fmtDecimal(metrics.portfolioBeta) },
                { label: 'Volatility (Ann.)', value: fmtPct(metrics.volatilityAnnualizedPct) },
                { label: 'Max Drawdown', value: fmtPct(metrics.maxDrawdownPct) },
                { label: 'Sharpe Ratio', value: fmtDecimal(metrics.sharpeRatio) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 tabular-nums font-mono text-xl font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Radar: normalized 0–100 for each metric */}
            {(() => {
              const beta = metrics.portfolioBeta
              const vol = metrics.volatilityAnnualizedPct
              const dd = metrics.maxDrawdownPct
              const sharpe = metrics.sharpeRatio
              if (beta === null && vol === null && dd === null && sharpe === null) return null

              const normalize = (v: number | null, min: number, max: number) =>
                v === null ? 0 : Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))

              return (
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-1 text-center text-xs font-semibold text-foreground">Risk Profile</h3>
                  <RadarChartComponent
                    height={220}
                    data={[
                      { axis: 'Beta', score: normalize(beta, 0, 2) },
                      { axis: 'Volatility', score: normalize(vol, 0, 50) },
                      { axis: 'Drawdown', score: normalize(dd !== null ? Math.abs(dd) : null, 0, 40) },
                      { axis: 'Sharpe', score: normalize(sharpe, -1, 3) },
                    ]}
                    series={[{ dataKey: 'score', name: 'Portfolio' }]}
                    domain={[0, 100]}
                  />
                </div>
              )
            })()}
          </motion.div>
        )}

        {/* Concentration risk */}
        {metrics && metrics.concentrationRisk.length > 0 && (
          <motion.div variants={staggerItem} className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Concentration Risk</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Symbol</th>
                    <th className="pb-2 text-left font-medium">Label</th>
                    <th className="pb-2 text-right font-medium">Weight %</th>
                    <th className="pb-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.concentrationRisk.map(item => (
                    <tr key={item.symbol} className="border-b border-border last:border-0">
                      <td className="py-2 font-mono font-semibold text-foreground">{item.symbol}</td>
                      <td className="py-2 text-muted-foreground">{item.label ?? '—'}</td>
                      <td className={cn('py-2 text-right font-mono', item.exceedsThreshold ? 'text-destructive font-bold' : 'text-foreground')}>
                        {fmtPct(item.weightPct)}
                      </td>
                      <td className="py-2 text-center">
                        {item.exceedsThreshold && (
                          <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-semibold text-destructive">
                            Over Limit
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Allocation drift - chart + table */}
        {metrics && metrics.allocationDrift.length > 0 && (
          <motion.div variants={staggerItem} className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Allocation Drift</h2>
            <UniversalChart
              chartId="risk-allocation-drift"
              data={metrics.allocationDrift.map(item => ({
                name: item.symbol,
                value: item.driftPct,
                color: item.driftPct > 0
                  ? '#16a34a'
                  : Math.abs(item.driftPct) > 5 ? '#dc2626' : '#f59e0b',
              }))}
              defaultType="bar"
              allowedTypes={['bar', 'donut', 'radar']}
              formatValue={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Symbol</th>
                    <th className="pb-2 text-right font-medium">Target %</th>
                    <th className="pb-2 text-right font-medium">Current %</th>
                    <th className="pb-2 text-right font-medium">Drift %</th>
                    <th className="pb-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.allocationDrift.map(item => (
                    <tr key={item.symbol} className="border-b border-border last:border-0">
                      <td className="py-2 font-mono font-semibold text-foreground">
                        {item.symbol}
                        {item.label && (
                          <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">
                            {item.label}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono">{fmtPct(item.targetPct)}</td>
                      <td className="py-2 text-right font-mono">{fmtPct(item.currentPct)}</td>
                      <td className={cn(
                        'py-2 text-right font-mono',
                        Math.abs(item.driftPct) > 5 ? 'text-destructive' : Math.abs(item.driftPct) > 2 ? 'text-warning' : 'text-foreground',
                      )}>
                        {item.driftPct >= 0 ? '+' : ''}{fmtPct(item.driftPct)}
                      </td>
                      <td className="py-2 text-center">
                        <span className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_COLORS[item.status],
                        )}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Sector + Geographic exposure */}
        {metrics && (
          <motion.div variants={staggerItem} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Sector */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Sector Exposure</h2>
              {metrics.sectorExposure.length > 0 ? (
                <UniversalChart
                  chartId="risk-sector"
                  data={metrics.sectorExposure.map(s => ({
                    name: s.sector,
                    value: s.weightPct,
                  }))}
                  defaultType="donut"
                  allowedTypes={['donut', 'bar', 'radar']}
                  height={220}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No sector data.</p>
              )}
            </div>

            {/* Geographic */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Geographic Exposure</h2>
              {metrics.geographicExposure.length > 0 ? (
                <UniversalChart
                  chartId="risk-geographic"
                  data={metrics.geographicExposure.map(g => ({
                    name: g.region,
                    value: g.weightPct,
                  }))}
                  defaultType="donut"
                  allowedTypes={['donut', 'bar', 'radar']}
                  height={220}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No geographic data.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Thresholds editor */}
        {thresholds && (
          <motion.div variants={staggerItem} className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Risk Thresholds</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: 'maxSinglePositionPct' as const, label: 'Max Single Position (%)', step: 0.5 },
                { key: 'maxSectorPct' as const, label: 'Max Sector Concentration (%)', step: 0.5 },
                { key: 'maxDrawdownPct' as const, label: 'Max Drawdown Alert (%)', step: 0.5 },
                { key: 'driftWarningPct' as const, label: 'Drift Warning Threshold (%)', step: 0.5 },
                { key: 'rebalanceReminderDays' as const, label: 'Rebalance Reminder (days)', step: 1 },
              ].map(({ key, label, step }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <input
                    type="number"
                    value={editingThresholds[key] ?? ''}
                    onChange={e => setEditingThresholds(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                    step={step}
                    min={0}
                    className={cn(
                      'w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground',
                      'focus:outline-none focus:ring-1 focus:ring-ring',
                    )}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSaveThresholds}
                disabled={savingThresholds}
                className={cn(
                  'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground',
                  'transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {savingThresholds ? 'Saving...' : 'Save Thresholds'}
              </button>
              {thresholdSaved && <span className="text-sm text-success">Saved.</span>}
              {thresholdSaveError && <span className="text-sm text-destructive">{thresholdSaveError}</span>}
            </div>
          </motion.div>
        )}
      </motion.div>
      </div>
    </div>
  )
}
