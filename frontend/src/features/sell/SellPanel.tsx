import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/contexts/currency-context'
import { formatMoney } from '@/lib/currency'
import { useSellPanel } from './useSellPanel'

interface SellPanelProps {
  symbol: string | null
  onClose: () => void
  onComplete: (result: import('@/api/sell').SellResult) => void
}

export type { SellPanelProps }

function QuickButton({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-all',
        active
          ? 'bg-purple-600 text-white'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {label}
    </button>
  )
}

export function SellPanel({ symbol, onClose, onComplete }: SellPanelProps) {
  const currency = useCurrency()
  const fmt = (v: number) => formatMoney(v, currency)
  const fmtNative = (v: number, cur: string) => formatMoney(v, cur)

  const {
    isOpen,
    step,
    preview,
    form,
    loading,
    submitting,
    error,
    isRetroactive,
    livePreview,
    validationError,
    canProceed,
    open,
    close,
    updateField,
    setQuickPercent,
    goToConfirm,
    goBackToForm,
    confirmSell,
  } = useSellPanel(symbol, onComplete)

  useEffect(() => {
    if (symbol) open(symbol)
  }, [symbol, open])

  const handleClose = () => {
    close()
    onClose()
  }

  if (!isOpen || !symbol) return null

  const effectiveShares = isRetroactive && preview?.sharesHeldAtDate != null
    ? preview.sharesHeldAtDate
    : preview?.sharesHeld ?? 0
  const effectiveAvgCost = isRetroactive && preview?.avgCostAtDate != null
    ? preview.avgCostAtDate
    : preview?.avgCostPerShare ?? 0
  const nativeCur = preview?.nativeCurrency ?? 'USD'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-card border-l border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">
                  Sell {preview?.symbol ?? symbol}
                  {preview?.label && <span className="text-muted-foreground font-normal"> — {preview.label}</span>}
                </h2>
                {preview && (
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>Price: {fmtNative(preview.currentPriceUsd, nativeCur)}</span>
                    <span>Avg Cost: {fmtNative(effectiveAvgCost, nativeCur)}</span>
                    <span>{effectiveShares} shares</span>
                    <span>Value: {fmt(preview.currentValueDisplay)}</span>
                  </div>
                )}
              </div>
              <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {step === 'form' ? (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-5 space-y-5"
                    >
                      {/* Quantity */}
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Quantity to Sell
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            max={effectiveShares}
                            value={form.quantity}
                            onChange={(e) => updateField('quantity', e.target.value)}
                            placeholder="0"
                            className="flex-1 font-mono"
                          />
                        </div>
                        <div className="mt-2 flex gap-1.5">
                          {[
                            { label: '25%', pct: 0.25 },
                            { label: '50%', pct: 0.5 },
                            { label: '75%', pct: 0.75 },
                            { label: 'All', pct: 1 },
                          ].map(({ label, pct }) => (
                            <QuickButton
                              key={label}
                              label={label}
                              active={
                                form.quantity !== '' &&
                                Math.abs(
                                  parseFloat(form.quantity) -
                                  (pct === 1 ? effectiveShares : Math.floor(effectiveShares * pct * 1e8) / 1e8)
                                ) < 0.000001
                              }
                              onClick={() => setQuickPercent(pct)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Price */}
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Price Per Share ({nativeCur})
                        </label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={form.price}
                          onChange={(e) => updateField('price', e.target.value)}
                          placeholder="0.00"
                          className="font-mono"
                        />
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Sell Date
                          </label>
                          <Input
                            type="date"
                            value={form.date}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => updateField('date', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Time
                          </label>
                          <Input
                            type="time"
                            value={form.time}
                            onChange={(e) => updateField('time', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Past date warning */}
                      <AnimatePresence>
                        {isRetroactive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>
                                Past date detected — historical data will be recalculated
                                from {new Date(form.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} onward
                                after confirming this sale.
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Notes */}
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Notes (optional)
                        </label>
                        <Input
                          value={form.notes}
                          onChange={(e) => updateField('notes', e.target.value)}
                          placeholder="Taking some profits..."
                        />
                      </div>

                      {/* Live Preview */}
                      {livePreview && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-lg border border-border bg-muted/30 p-4 space-y-2"
                        >
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Live Preview
                          </h3>
                          <div className="space-y-1.5 text-sm">
                            <Row label="Selling" value={`${livePreview.quantity} shares`} />
                            <Row label="At" value={`${fmtNative(livePreview.sellPrice, nativeCur)} per share`} />
                            <Row
                              label="Total"
                              value={`${fmtNative(livePreview.totalProceedsUsd, nativeCur)} (${fmt(livePreview.totalProceedsDisplay)})`}
                            />
                            <Row label="Remaining" value={`${livePreview.remainingShares} shares after this sell`} />
                            <Row label="Avg Cost" value={`${fmtNative(livePreview.avgCost, nativeCur)} per share`} />
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-muted-foreground">P&L on Sale</span>
                              <span
                                className={cn(
                                  'flex items-center gap-1 font-semibold font-mono',
                                  livePreview.pnlUsd >= 0 ? 'text-success' : 'text-destructive'
                                )}
                              >
                                {livePreview.pnlUsd >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                {livePreview.pnlUsd >= 0 ? '+' : ''}
                                {fmtNative(livePreview.pnlUsd, nativeCur)} ({fmt(livePreview.pnlDisplay)}) ({livePreview.pnlPercent >= 0 ? '+' : ''}
                                {livePreview.pnlPercent.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Validation error */}
                      {validationError && (
                        <p className="text-sm text-destructive">{validationError}</p>
                      )}

                      {/* Error from API */}
                      {error && <p className="text-sm text-destructive">{error}</p>}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-5 space-y-5"
                    >
                      <h3 className="text-base font-semibold text-foreground">Confirm Sale</h3>

                      {livePreview && (
                        <div className="space-y-3 text-sm">
                          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                            <p className="font-semibold text-foreground">
                              SELL {livePreview.quantity} shares of {preview?.symbol}
                            </p>
                            <Row label="Date" value={new Date(`${form.date}T${form.time}`).toLocaleString()} />
                            <Row label="Price" value={`${fmtNative(livePreview.sellPrice, nativeCur)} per share`} />
                            <Row
                              label="Total"
                              value={`${fmtNative(livePreview.totalProceedsUsd, nativeCur)} (${fmt(livePreview.totalProceedsDisplay)})`}
                            />
                            <Row label="Avg Cost" value={`${fmtNative(livePreview.avgCost, nativeCur)} per share`} />
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">P&L on Sale</span>
                              <span
                                className={cn(
                                  'font-semibold font-mono',
                                  livePreview.pnlUsd >= 0 ? 'text-success' : 'text-destructive'
                                )}
                              >
                                {livePreview.pnlUsd >= 0 ? '+' : ''}
                                {fmtNative(livePreview.pnlUsd, nativeCur)} ({fmt(livePreview.pnlDisplay)}) ({livePreview.pnlPercent >= 0 ? '+' : ''}
                                {livePreview.pnlPercent.toFixed(2)}%)
                              </span>
                            </div>
                            <Row label="Remaining" value={`${livePreview.remainingShares} shares after this sale`} />
                            {livePreview.positionCloses && (
                              <p className="text-amber-400 text-xs mt-1">
                                This will close your entire {preview?.symbol} position.
                              </p>
                            )}
                          </div>

                          {isRetroactive && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>
                                Historical data will be recalculated from{' '}
                                {new Date(form.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                                onward in the background.
                              </span>
                            </div>
                          )}

                        </div>
                      )}

                      {error && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                          <p className="text-sm text-destructive font-medium">{error}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {!loading && (
              <div className="border-t border-border px-5 py-4">
                {step === 'form' ? (
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={!canProceed}
                      onClick={goToConfirm}
                    >
                      Review Sale →
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={goBackToForm}>
                      <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                    </Button>
                    <Button
                      variant="destructive"
                      className={cn(
                        'flex-1 font-semibold',
                        !submitting && 'animate-pulse'
                      )}
                      disabled={submitting}
                      onClick={confirmSell}
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Processing...
                        </div>
                      ) : (
                        'Confirm Sale'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  )
}
