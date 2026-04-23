/**
 * Direct API client for test setup/teardown — bypasses the browser.
 * Talks to the backend to seed data, verify DB state, and clean up.
 */

const API_URL = process.env.API_URL ?? 'http://localhost:8080'

async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })

  let data: T | undefined
  const text = await res.text()
  try {
    data = text ? JSON.parse(text) as T : undefined
  } catch {
    data = text as unknown as T
  }

  return { status: res.status, data: data as T }
}

export const api = {
  get:    <T = unknown>(path: string) => apiRequest<T>('GET', path),
  post:   <T = unknown>(path: string, body?: unknown) => apiRequest<T>('POST', path, body),
  put:    <T = unknown>(path: string, body?: unknown) => apiRequest<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => apiRequest<T>('DELETE', path),
  patch:  <T = unknown>(path: string, body?: unknown) => apiRequest<T>('PATCH', path, body),
}

// ── Profile ──────────────────────────────────────────────────────────

export async function ensureProfile(profileData: Record<string, unknown>) {
  const existing = await api.get('/api/profile')
  if (existing.status === 200) {
    return api.put<Record<string, unknown>>('/api/profile', profileData)
  }
  return api.post<Record<string, unknown>>('/api/profile', profileData)
}

export async function completeOnboarding() {
  return api.post('/api/profile/complete-onboarding')
}

// ── Allocations ──────────────────────────────────────────────────────

export async function replaceAllocations(allocations: Array<Record<string, unknown>>) {
  return api.put<unknown[]>('/api/allocations', allocations)
}

// ── Transactions ─────────────────────────────────────────────────────

export async function createTransaction(tx: Record<string, unknown>) {
  return api.post<Record<string, unknown>>('/api/transactions', tx)
}

export async function getTransactions(page = 0, size = 100) {
  return api.get<{ content: unknown[]; totalElements: number }>(
    `/api/transactions?page=${page}&size=${size}`,
  )
}

export async function deleteTransaction(id: string) {
  return api.delete(`/api/transactions/${id}`)
}

// ── Holdings ─────────────────────────────────────────────────────────

export async function getHoldings() {
  return api.get<unknown[]>('/api/holdings')
}

// ── Portfolio ────────────────────────────────────────────────────────

export async function getPortfolioSummary() {
  return api.get<Record<string, unknown>>('/api/portfolio/summary')
}

export async function getPortfolioHoldings() {
  return api.get<unknown[]>('/api/portfolio/holdings')
}

// ── Monthly Flow ─────────────────────────────────────────────────────

export async function previewMonthlyFlow(budget: number) {
  return api.post<Record<string, unknown>>('/api/monthly-flow/preview', { budget })
}

export async function confirmMonthlyFlow(
  budget: number,
  allocations: Array<{ symbol: string; amount: number }>,
) {
  return api.post<Record<string, unknown>>('/api/monthly-flow/confirm', {
    budget,
    allocations,
  })
}

// ── Alerts ───────────────────────────────────────────────────────────

export async function createAlert(data: Record<string, unknown>) {
  return api.post<Record<string, unknown>>('/api/alerts', data)
}

export async function updateAlert(
  id: string,
  data: Record<string, unknown>
) {
  return api.put<Record<string, unknown>>(`/api/alerts/${id}`, data)
}

export async function getAlerts() {
  return api.get<unknown[]>('/api/alerts')
}

// ── Watchlist ────────────────────────────────────────────────────────

export async function addToWatchlist(data: Record<string, unknown>) {
  return api.post<Record<string, unknown>>('/api/watchlist', data)
}

export async function getWatchlist() {
  return api.get<unknown[]>('/api/watchlist')
}

// ── Options ──────────────────────────────────────────────────────────

export async function createOption(data: Record<string, unknown>) {
  return api.post<Record<string, unknown>>('/api/options', data)
}

export async function getOptions() {
  return api.get<unknown[]>('/api/options')
}

// ── Analytics ────────────────────────────────────────────────────────

export async function getAnalytics(range = '3M') {
  return api.get<Record<string, unknown>>(`/api/analytics?range=${range}`)
}

// ── Chat ─────────────────────────────────────────────────────────────

export async function sendChatMessage(message: string) {
  return api.post<Record<string, unknown>>('/api/chat', { message })
}

// ── Risk ─────────────────────────────────────────────────────────────

export async function getRiskMetrics() {
  return api.get<Record<string, unknown>>('/api/risk/metrics')
}

// ── Export ────────────────────────────────────────────────────────────

export async function exportHoldings(format = 'csv') {
  return api.get<string>(`/api/export/holdings?format=${format}`)
}

// ── Telegram Schedules ───────────────────────────────────────────────

export async function getSchedules() {
  return api.get<unknown[]>('/api/telegram/schedules')
}

export async function createSchedule(data: Record<string, unknown>) {
  return api.post<Record<string, unknown>>('/api/telegram/schedules', data)
}
