import client from './client'
import type { WatchlistItem } from '@/types'

export const getWatchlist = () =>
  client.get<WatchlistItem[]>('/api/watchlist').then(r => r.data)

export const addWatchlistItem = (symbol: string, assetType: string) =>
  client.post<WatchlistItem>('/api/watchlist', { symbol, assetType }).then(r => r.data)

export const removeWatchlistItem = (id: string) =>
  client.delete(`/api/watchlist/${id}`)

export const analyzeWatchlistItem = (id: string) =>
  client.post<WatchlistItem>(`/api/watchlist/${id}/analyze`).then(r => r.data)
