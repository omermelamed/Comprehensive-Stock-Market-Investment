import client from './client'
import type { Holding } from '../types'

export const getHoldings = () => client.get<Holding[]>('/api/holdings').then(r => r.data)
