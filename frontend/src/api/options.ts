import client from './client'
import type { OptionsListResponse, OptionsTransaction, OptionsStrategyResponse } from '../types'

export interface CreateOptionsTransactionRequest {
  underlyingSymbol: string
  optionType: 'CALL' | 'PUT'
  action: 'BUY' | 'SELL'
  strikePrice: number
  expirationDate: string   // YYYY-MM-DD
  contracts: number
  premiumPerContract: number
  notes?: string
}

export const listOptions = () =>
  client.get<OptionsListResponse>('/api/options').then(r => r.data)

export const createOptionsTransaction = (data: CreateOptionsTransactionRequest) =>
  client.post<OptionsTransaction>('/api/options', data).then(r => r.data)

export const updateOptionsStatus = (id: string, status: 'EXPIRED' | 'EXERCISED' | 'CLOSED') =>
  client.put<OptionsTransaction>(`/api/options/${id}/status`, { status }).then(r => r.data)

export const deleteOptionsTransaction = (id: string) =>
  client.delete(`/api/options/${id}`)

export const getOptionsStrategy = (symbol: string) =>
  client.get<OptionsStrategyResponse>(`/api/options/${symbol}/strategy`).then(r => r.data)
