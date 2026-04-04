import client from './client'
import type { TargetAllocation } from '../types'

export const getAllocations = () => client.get<TargetAllocation[]>('/api/allocations').then(r => r.data)
export const bulkReplaceAllocations = (data: unknown[]) => client.put<TargetAllocation[]>('/api/allocations', data).then(r => r.data)
export const createAllocation = (data: unknown) => client.post<TargetAllocation>('/api/allocations', data).then(r => r.data)
export const updateAllocation = (id: number, data: unknown) => client.put<TargetAllocation>(`/api/allocations/${id}`, data).then(r => r.data)
export const deleteAllocation = (id: number) => client.delete(`/api/allocations/${id}`)
