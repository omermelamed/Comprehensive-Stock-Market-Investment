import client from './client'
import type { RecommendationsResponse } from '@/types'

export const getRecommendations = () =>
  client.get<RecommendationsResponse>('/api/recommendations').then(r => r.data)

export const refreshRecommendations = () =>
  client.post<RecommendationsResponse>('/api/recommendations/refresh').then(r => r.data)
