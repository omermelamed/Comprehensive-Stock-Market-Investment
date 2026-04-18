import client from './client'
import type { Transaction } from '../types'

export const getTransactions = (page = 0, size = 20) =>
  client.get<{ content: Transaction[]; totalElements: number }>('/api/transactions', { params: { page, size } }).then(r => r.data)
export const createTransaction = (data: unknown) => client.post<Transaction>('/api/transactions', data).then(r => r.data)
export const deleteTransaction = (id: string) => client.delete(`/api/transactions/${id}`)
