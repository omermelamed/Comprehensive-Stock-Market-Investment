import client from './client'
import type { Alert } from '@/types'

export const getAlerts = () =>
  client.get<Alert[]>('/api/alerts').then(r => r.data)

export const createAlert = (
  symbol: string,
  condition: string,
  thresholdPrice: number,
  note?: string
) =>
  client
    .post<Alert>('/api/alerts', { symbol, condition, thresholdPrice, note })
    .then(r => r.data)

export const updateAlert = (
  id: string,
  symbol: string,
  condition: string,
  thresholdPrice: number,
  note?: string
) =>
  client
    .put<Alert>(`/api/alerts/${id}`, {
      symbol,
      condition,
      thresholdPrice,
      note,
    })
    .then(r => r.data)

export const deleteAlert = (id: string) =>
  client.delete(`/api/alerts/${id}`)

export const getUnreadCount = () =>
  client.get<{ count: number }>('/api/alerts/unread-count').then(r => r.data)

export const dismissAlert = (id: string) =>
  client.post(`/api/alerts/${id}/dismiss`)

export const reEnableAlert = (id: string) =>
  client.post<Alert>(`/api/alerts/${id}/re-enable`).then(r => r.data)
