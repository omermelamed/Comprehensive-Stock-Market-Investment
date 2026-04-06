import client from './client'
import type { Alert } from '@/types'

export const getAlerts = () =>
  client.get<Alert[]>('/api/alerts').then(r => r.data)

export const createAlert = (symbol: string, condition: string, thresholdPrice: number, note?: string) =>
  client.post<Alert>('/api/alerts', { symbol, condition, thresholdPrice, note }).then(r => r.data)

export const deleteAlert = (id: string) =>
  client.delete(`/api/alerts/${id}`)
