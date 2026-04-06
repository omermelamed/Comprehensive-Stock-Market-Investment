import client from './client'

export interface SymbolAlias {
  id: string
  alias: string
  yahooSymbol: string
  createdAt: string
}

export const getSymbolAliases = () =>
  client.get<SymbolAlias[]>('/api/symbol-aliases').then(r => r.data)

export const createSymbolAlias = (alias: string, yahooSymbol: string) =>
  client.post<SymbolAlias>('/api/symbol-aliases', { alias, yahooSymbol }).then(r => r.data)

export const deleteSymbolAlias = (id: string) =>
  client.delete(`/api/symbol-aliases/${id}`)
