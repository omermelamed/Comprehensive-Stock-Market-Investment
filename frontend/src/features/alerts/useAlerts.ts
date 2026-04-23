import { useEffect, useState } from 'react'
import {
  getAlerts,
  createAlert as apiCreateAlert,
  updateAlert as apiUpdateAlert,
  deleteAlert as apiDeleteAlert,
  dismissAlert as apiDismissAlert,
  reEnableAlert as apiReEnableAlert,
} from '@/api/alerts'
import type { Alert } from '@/types'

export interface CreateAlertData {
  symbol: string
  condition: 'ABOVE' | 'BELOW'
  thresholdPrice: number
  note?: string
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getAlerts()
      .then(data => setAlerts(data))
      .catch(() => setAlerts([]))
      .finally(() => setIsLoading(false))
  }, [])

  const active = alerts.filter(a => a.isActive)
  const triggered = alerts.filter(a => !a.isActive && a.triggeredAt !== null)
  const unreadCount = triggered.filter(a => a.dismissedAt === null).length

  async function createAlert(data: CreateAlertData) {
    const created = await apiCreateAlert(
      data.symbol,
      data.condition,
      data.thresholdPrice,
      data.note
    )
    setAlerts(prev => [created, ...prev])
  }

  async function updateAlert(id: string, data: CreateAlertData) {
    const updated = await apiUpdateAlert(
      id,
      data.symbol,
      data.condition,
      data.thresholdPrice,
      data.note
    )
    setAlerts(prev => prev.map(a => (a.id === id ? updated : a)))
  }

  async function deleteAlert(id: string) {
    // Optimistic remove
    setAlerts(prev => prev.filter(a => a.id !== id))
    try {
      await apiDeleteAlert(id)
    } catch {
      // Restore on failure
      getAlerts()
        .then(data => setAlerts(data))
        .catch(() => {})
    }
  }

  async function dismissAlert(id: string) {
    // Optimistic update — mark dismissedAt as now
    setAlerts(prev =>
      prev.map(a =>
        a.id === id ? { ...a, dismissedAt: new Date().toISOString() } : a
      )
    )
    try {
      await apiDismissAlert(id)
    } catch {
      getAlerts()
        .then(data => setAlerts(data))
        .catch(() => {})
    }
  }

  async function dismissAll() {
    const unread = triggered.filter(a => a.dismissedAt === null)
    // Optimistic batch update
    const now = new Date().toISOString()
    setAlerts(prev =>
      prev.map(a =>
        unread.some(u => u.id === a.id) ? { ...a, dismissedAt: now } : a
      )
    )
    try {
      await Promise.all(unread.map(a => apiDismissAlert(a.id)))
    } catch {
      getAlerts()
        .then(data => setAlerts(data))
        .catch(() => {})
    }
  }

  async function reEnableAlert(id: string) {
    const updated = await apiReEnableAlert(id)
    setAlerts(prev => prev.map(a => (a.id === id ? updated : a)))
  }

  return {
    active,
    triggered,
    unreadCount,
    isLoading,
    createAlert,
    updateAlert,
    deleteAlert,
    dismissAlert,
    dismissAll,
    reEnableAlert,
  }
}
