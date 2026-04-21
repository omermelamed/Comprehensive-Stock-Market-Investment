import { useState } from 'react'
import { createTransaction } from '../../api/transactions'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface TransactionFormData {
  symbol: string
  transactionType: 'BUY' | 'SELL' | 'SHORT' | 'COVER' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL'
  quantity: number
  pricePerUnit: number
  fees: number
  currency: string
  transactionDate: string
  notes: string
  track: string
}

const DEFAULT_FORM: TransactionFormData = {
  symbol: '',
  transactionType: 'BUY',
  quantity: 0,
  pricePerUnit: 0,
  fees: 0,
  currency: 'USD',
  transactionDate: today(),
  notes: '',
  track: 'LONG_EQUITY',
}

export function useTransactionForm(onSuccess: () => void) {
  const [formData, setFormData] = useState<TransactionFormData>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof TransactionFormData>(key: K, value: TransactionFormData[K]) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      await createTransaction({
        symbol: formData.symbol,
        type: formData.transactionType,
        track: formData.track,
        quantity: formData.quantity,
        pricePerUnit: formData.pricePerUnit,
        fees: formData.fees,
        notes: formData.notes || undefined,
      })
      setFormData(DEFAULT_FORM)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit transaction')
    } finally {
      setSubmitting(false)
    }
  }

  return { formData, setField, submit, submitting, error }
}
