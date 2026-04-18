import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  getSellPreview,
  executeSell,
  type SellPreview,
  type SellResult,
} from '@/api/sell'

export type SellPanelStep = 'form' | 'confirm'

export interface SellFormState {
  quantity: string
  price: string
  date: string
  time: string
  notes: string
}

export function useSellPanel(symbol: string | null, onComplete?: (result: SellResult) => void) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<SellPanelStep>('form')
  const [preview, setPreview] = useState<SellPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SellResult | null>(null)

  const now = new Date()
  const [form, setForm] = useState<SellFormState>({
    quantity: '',
    price: '',
    date: now.toISOString().split('T')[0],
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    notes: '',
  })

  const open = useCallback((sym: string) => {
    setStep('form')
    setError(null)
    setResult(null)
    const n = new Date()
    setForm({
      quantity: '',
      price: '',
      date: n.toISOString().split('T')[0],
      time: `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`,
      notes: '',
    })
    setIsOpen(true)
    setLoading(true)
    getSellPreview(sym)
      .then((p) => {
        setPreview(p)
        setForm((f) => ({ ...f, price: String(p.currentPriceUsd) }))
      })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load sell preview'))
      .finally(() => setLoading(false))
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setStep('form')
    setError(null)
  }, [])

  const updateField = useCallback((field: keyof SellFormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setError(null)
  }, [])

  const setQuickPercent = useCallback((pct: number) => {
    if (!preview) return
    const shares = preview.isRetroactive && preview.sharesHeldAtDate != null
      ? preview.sharesHeldAtDate
      : preview.sharesHeld
    if (pct === 1) {
      setForm((f) => ({ ...f, quantity: String(shares) }))
    } else {
      const qty = Math.floor(shares * pct * 1e8) / 1e8
      setForm((f) => ({ ...f, quantity: String(qty) }))
    }
  }, [preview])

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const isRetroactive = form.date < today

  useEffect(() => {
    if (!symbol || !isRetroactive || !isOpen) return
    let cancelled = false
    getSellPreview(symbol, { date: form.date })
      .then((p) => {
        if (cancelled) return
        setPreview((prev) => ({
          ...prev!,
          isRetroactive: p.isRetroactive,
          retroactiveDate: p.retroactiveDate,
          historicalPriceUsd: p.historicalPriceUsd,
          sharesHeldAtDate: p.sharesHeldAtDate,
          avgCostAtDate: p.avgCostAtDate,
        }))
        if (p.historicalPriceUsd != null) {
          setForm((f) => ({ ...f, price: String(p.historicalPriceUsd) }))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [symbol, form.date, isRetroactive, isOpen])

  const livePreview = useMemo(() => {
    if (!preview) return null
    const qty = parseFloat(form.quantity)
    const price = parseFloat(form.price)
    if (!qty || qty <= 0 || !price || price <= 0) return null

    const effectiveShares = isRetroactive && preview.sharesHeldAtDate != null
      ? preview.sharesHeldAtDate
      : preview.sharesHeld
    const effectiveAvgCost = isRetroactive && preview.avgCostAtDate != null
      ? preview.avgCostAtDate
      : preview.avgCostPerShare

    const totalProceeds = price * qty
    const pnlPerShare = price - effectiveAvgCost
    const pnlUsd = pnlPerShare * qty
    const pnlPercent = effectiveAvgCost > 0 ? (pnlPerShare / effectiveAvgCost) * 100 : 0
    const remaining = effectiveShares - qty
    const fxRate = preview.exchangeRate

    return {
      quantity: qty,
      sellPrice: price,
      totalProceedsUsd: totalProceeds,
      totalProceedsDisplay: totalProceeds * fxRate,
      avgCost: effectiveAvgCost,
      pnlUsd,
      pnlDisplay: pnlUsd * fxRate,
      pnlPercent,
      remainingShares: Math.max(0, remaining),
      positionCloses: remaining <= 0,
    }
  }, [preview, form.quantity, form.price, isRetroactive])

  const validationError = useMemo(() => {
    if (!preview) return null
    const qty = parseFloat(form.quantity)
    const price = parseFloat(form.price)
    const effectiveShares = isRetroactive && preview.sharesHeldAtDate != null
      ? preview.sharesHeldAtDate
      : preview.sharesHeld

    if (form.quantity && (isNaN(qty) || qty <= 0)) return 'Please enter a quantity greater than 0'
    if (form.quantity && qty > effectiveShares) {
      return `You only hold ${effectiveShares} shares. You cannot sell more than you own.`
    }
    if (form.price && (isNaN(price) || price <= 0)) return 'Please enter a valid price greater than 0'
    if (form.date > today) return 'Sell date cannot be in the future'
    return null
  }, [preview, form.quantity, form.price, form.date, isRetroactive, today])

  const canProceed = form.quantity !== '' && form.price !== '' && !validationError

  const goToConfirm = useCallback(() => {
    if (!canProceed) return
    setStep('confirm')
  }, [canProceed])

  const goBackToForm = useCallback(() => {
    setStep('form')
  }, [])

  const confirmSell = useCallback(async () => {
    if (!preview || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const executedAt = new Date(`${form.date}T${form.time}:00`).toISOString()
      const res = await executeSell({
        symbol: preview.symbol,
        quantity: parseFloat(form.quantity),
        pricePerUnit: parseFloat(form.price),
        executedAt,
        notes: form.notes || undefined,
        source: 'APP',
      })
      setResult(res)
      setIsOpen(false)
      onComplete?.(res)
    } catch (e: any) {
      const data = e?.response?.data
      setError(data?.message || data?.error || 'Sale failed — please try again')
    } finally {
      setSubmitting(false)
    }
  }, [preview, form, submitting, onComplete])

  return {
    isOpen,
    step,
    preview,
    form,
    loading,
    submitting,
    error,
    result,
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
  }
}
