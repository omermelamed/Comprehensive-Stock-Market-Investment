import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getRiskMetrics,
  getRiskWarnings,
  getRiskThresholds,
  updateRiskThresholds,
  type RiskMetricsResponse,
  type RiskWarningsResponse,
  type RiskThresholds,
} from '@/api/risk'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtPlain(value: number | null | undefined, decimals = 2, suffix = '%'): string {
  if (value === null || value === undefined) return 'N/A'
  return `${value.toFixed(decimals)}${suffix}`
}

function signedPct(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return 'N/A'
  const sign = value >= 0 ? '+' : '−'
  return `${sign}${Math.abs(value).toFixed(decimals)}%`
}

function returnColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-muted-foreground'
  return value >= 0 ? 'text-success' : 'text-destructive'
}

function warningSeverityClass(severity: string): string {
  const s = severity.toUpperCase()
  if (s === 'HIGH') {
    return 'border-destructive/50 bg-destructive/10 text-destructive'
  }
  if (s === 'MEDIUM') {
    return 'border-warning/50 bg-warning/10 text-warning'
  }
  return 'border-border bg-muted/60 text-muted-foreground'
}

function driftStatusClass(status: string): string {
  switch (status) {
    case 'ON_TARGET':
      return 'text-success'
    case 'SLIGHTLY_OFF':
      return 'text-warning'
    case 'NEEDS_REBALANCING':
      return 'text-destructive'
    case 'UNTRACKED':
      return 'text-muted-foreground'
    default:
      return 'text-muted-foreground'
  }
}

const SECTOR_COLORS = [
  'oklch(0.65 0.2 264)',
  'oklch(0.7 0.15 200)',
  'oklch(0.75 0.12 145)',
  'oklch(0.72 0.18 45)',
  'oklch(0.68 0.22 25)',
  'oklch(0.62 0.18 300)',
  'oklch(0.7 0.1 220)',
]

// ── MetricCard ────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  subLabel?: string
  colored?: boolean
  rawValue?: number | null
}

function MetricCard({ label, value, subLabel, colored, rawValue }: MetricCardProps) {
  const colorClass = colored ? returnColor(rawValue) : 'text-foreground'
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-xl font-bold', colorClass)}>{value}</p>
      {subLabel && <p className="mt-0.5 text-xs text-muted-foreground">{subLabel}</p>}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function RiskPage() {
  const [metrics, setMetrics] = useState<RiskMetricsResponse | null>(null)
  const [warningsData, setWarningsData] = useState<RiskWarningsResponse | null>(null)
  const [thresholds, setThresholds] = useState<RiskThresholds | null>(null)
  const [draft, setDraft] = useState<RiskThresholds | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getRiskMetrics(), getRiskWarnings(), getRiskThresholds()])
      .then(([m, w, t]) => {
        if (cancelled) return
        setMetrics(m)
        setWarningsData(w)
        setThresholds(t)
        setDraft(t)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load risk data. Check that the backend is running.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const m = metrics
  const thresholdPct = thresholds?.maxSinglePositionPct ?? 0

  const handleDraftChange = (patch: Partial<RiskThresholds>) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev))
  }

  const handleSaveThresholds = async () => {
    if (!draft) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateRiskThresholds(draft)
      setThresholds(updated)
      setDraft(updated)
      const fresh = await getRiskMetrics()
      setMetrics(fresh)
    } catch {
      setSaveError('Could not save thresholds.')
    } finally {
      setSaving(false)
    }
  }

  const sectorTotal =
    m && m.sectorExposure.length > 0
      ? m.sectorExposure.reduce((s, x) => s + x.weightPct, 0) || 1
      : 1

  const sectorConicStops = m
    ? (() => {
        let deg = 0
        const parts: string[] = []
        for (let i = 0; i < m.sectorExposure.length; i++) {
          const sec = m.sectorExposure[i]
          const span = (sec.weightPct / sectorTotal) * 360
          const color = sec.exceedsThreshold ? 'oklch(0.55 0.22 25)' : SECTOR_COLORS[i % SECTOR_COLORS.length]
          const end = deg + span
          parts.push(`${color} ${deg}deg ${end}deg`)
          deg = end
        }
        return parts.join(', ')
      })()
    : ''

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-foreground">Risk Management</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Concentration, drift, and threshold-based risk signals for your portfolio.
        </p>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* 1. Warnings banner */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Risk warnings</h2>
            {loading && !warningsData ? (
              <div className="mt-3 h-16 animate-pulse rounded-lg bg-muted" />
            ) : warningsData && warningsData.warnings.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {warningsData.warnings.map((w, i) => (
                  <li
                    key={`${w.type}-${i}`}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm',
                      warningSeverityClass(w.severity),
                    )}
                  >
                    {w.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
                No risk warnings
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                Last rebalance:{' '}
                <span className="font-mono text-foreground">
                  {warningsData?.lastRebalanceDate ?? '—'}
                </span>
              </span>
              <span>
                Days since rebalance:{' '}
                <span className="font-mono text-foreground">
                  {warningsData?.daysSinceRebalance !== null && warningsData?.daysSinceRebalance !== undefined
                    ? warningsData.daysSinceRebalance
                    : '—'}
                </span>
              </span>
            </div>
          </div>

          {/* 2. Overview cards */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Overview</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard
                label="Volatility (annualized)"
                value={m ? fmtPlain(m.volatilityAnnualizedPct) : '—'}
                subLabel="std dev, annualized"
              />
              <MetricCard
                label="Max drawdown"
                value={m
                  ? m.maxDrawdownPct !== null && m.maxDrawdownPct !== undefined
                    ? `${m.maxDrawdownPct.toFixed(2)}%`
                    : 'N/A'
                  : '—'}
                subLabel="historical peak-to-trough"
              />
              <MetricCard
                label="Sharpe ratio"
                value={m ? fmtPlain(m.sharpeRatio, 2, '') : '—'}
                subLabel="risk-adjusted return"
                colored
                rawValue={m?.sharpeRatio}
              />
              <MetricCard
                label="Portfolio beta"
                value={m
                  ? m.portfolioBeta !== null && m.portfolioBeta !== undefined
                    ? m.portfolioBeta.toFixed(2)
                    : 'N/A'
                  : '—'}
                subLabel="vs market"
              />
            </div>
          </div>

          {loading && !m && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {m && (
            <>
              {/* 3. Concentration */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">Concentration risk</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Position weights vs max single position threshold ({fmtPlain(thresholdPct, 2)}).
                  </p>
                </div>
                <div className="p-4">
                  {m.concentrationRisk.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No positions to display.</p>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex min-w-[120px] flex-col gap-2">
                        {m.concentrationRisk.map(row => (
                          <div
                            key={row.symbol}
                            className="flex h-6 flex-col justify-center text-xs leading-tight"
                          >
                            <span className="font-mono font-semibold text-foreground">{row.symbol}</span>
                            {row.label && row.label !== row.symbol && (
                              <span className="truncate text-muted-foreground">{row.label}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="relative min-w-0 flex-1 space-y-2">
                        {m.concentrationRisk.map(row => {
                          const w = Math.min(Math.max(row.weightPct, 0), 100)
                          return (
                            <div key={row.symbol} className="relative h-6">
                              <div className="h-full overflow-hidden rounded bg-muted/80">
                                <div
                                  className={cn(
                                    'h-full rounded transition-colors',
                                    row.exceedsThreshold ? 'bg-destructive/80' : 'bg-primary/80',
                                  )}
                                  style={{ width: `${w}%` }}
                                />
                              </div>
                              <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
                                {row.weightPct.toFixed(1)}%
                              </span>
                            </div>
                          )
                        })}
                        <div
                          className="pointer-events-none absolute inset-0 z-10"
                          aria-hidden
                        >
                          <div
                            className="absolute bottom-0 top-0 w-0 border-l-2 border-dashed border-foreground/70"
                            style={{ left: `${Math.min(Math.max(thresholdPct, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Drift table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">Allocation drift</h3>
                </div>
                <div className="overflow-x-auto">
                  {m.allocationDrift.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No drift rows.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left font-medium">Symbol</th>
                          <th className="px-4 py-2 text-right font-medium">Target %</th>
                          <th className="px-4 py-2 text-right font-medium">Current %</th>
                          <th className="px-4 py-2 text-right font-medium">Drift %</th>
                          <th className="px-4 py-2 text-right font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.allocationDrift.map(row => (
                          <tr
                            key={row.symbol}
                            className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                          >
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-xs font-semibold">{row.symbol}</span>
                              {row.label && row.label !== row.symbol && (
                                <span className="ml-1.5 text-xs text-muted-foreground">{row.label}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs">
                              {row.targetPct.toFixed(2)}%
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs">
                              {row.currentPct.toFixed(2)}%
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs">{signedPct(row.driftPct)}</td>
                            <td
                              className={cn(
                                'px-4 py-2.5 text-right text-xs font-medium',
                                driftStatusClass(row.status),
                              )}
                            >
                              {row.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* 5. Sector exposure */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">Sector exposure</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sectors above max sector threshold are highlighted.
                  </p>
                </div>
                <div className="p-4">
                  {m.sectorExposure.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sector breakdown.</p>
                  ) : (
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                      <div
                        className="relative h-40 w-40 shrink-0 rounded-full"
                        style={{
                          background: `conic-gradient(${sectorConicStops})`,
                        }}
                      >
                        <div className="absolute inset-8 rounded-full bg-card" />
                      </div>
                      <div className="w-full min-w-0 flex-1 space-y-2">
                        {m.sectorExposure.map((sec, i) => (
                          <div key={sec.sector} className="flex items-center gap-2 text-xs">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                background: sec.exceedsThreshold
                                  ? 'oklch(0.55 0.22 25)'
                                  : SECTOR_COLORS[i % SECTOR_COLORS.length],
                              }}
                            />
                            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                              {sec.sector}
                            </span>
                            <span
                              className={cn(
                                'font-mono',
                                sec.exceedsThreshold ? 'text-destructive' : 'text-foreground',
                              )}
                            >
                              {sec.weightPct.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Geographic */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">Geographic exposure</h3>
                </div>
                <div className="space-y-3 p-4">
                  {m.geographicExposure.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No geographic breakdown.</p>
                  ) : (
                    m.geographicExposure.map(geo => (
                      <div key={geo.region}>
                        <div className="mb-0.5 flex justify-between text-xs">
                          <span className="text-foreground">{geo.region}</span>
                          <span className="font-mono text-muted-foreground">{geo.weightPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded bg-muted/80">
                          <div
                            className="h-full rounded bg-primary/60"
                            style={{ width: `${Math.min(geo.weightPct, 100)}%` }}
                          />
                        </div>
                        {geo.symbols.length > 0 && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {geo.symbols.join(', ')}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* 7. Thresholds settings */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setSettingsOpen(o => !o)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
            >
              {settingsOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              Settings
            </button>
            {settingsOpen && draft && (
              <div className="border-t border-border px-4 py-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted-foreground">Max single position %</span>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                      value={draft.maxSinglePositionPct}
                      onChange={e => handleDraftChange({ maxSinglePositionPct: Number(e.target.value) })}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted-foreground">Max sector %</span>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                      value={draft.maxSectorPct}
                      onChange={e => handleDraftChange({ maxSectorPct: Number(e.target.value) })}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted-foreground">Max drawdown %</span>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                      value={draft.maxDrawdownPct}
                      onChange={e => handleDraftChange({ maxDrawdownPct: Number(e.target.value) })}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted-foreground">Drift warning %</span>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                      value={draft.driftWarningPct}
                      onChange={e => handleDraftChange({ driftWarningPct: Number(e.target.value) })}
                    />
                  </label>
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Rebalance reminder (days)</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                      value={draft.rebalanceReminderDays}
                      onChange={e => handleDraftChange({ rebalanceReminderDays: Number(e.target.value) })}
                    />
                  </label>
                </div>
                {saveError && (
                  <p className="text-sm text-destructive">{saveError}</p>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveThresholds}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
