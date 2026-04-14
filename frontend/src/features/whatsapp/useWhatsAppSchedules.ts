import { useCallback, useEffect, useState } from 'react'
import {
  createSchedule,
  deleteSchedule,
  getScheduleHistory,
  listSchedules,
  toggleSchedule,
  updateSchedule,
} from '@/api/whatsappSchedules'
import type {
  ScheduledMessage,
  ScheduledMessageLogEntry,
  ScheduledMessageRequest,
} from '@/api/whatsappSchedules'

export function useWhatsAppSchedules() {
  const [schedules, setSchedules] = useState<ScheduledMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listSchedules()
      .then(setSchedules)
      .catch(() => setError('Failed to load schedules'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function create(req: ScheduledMessageRequest): Promise<ScheduledMessage> {
    const created = await createSchedule(req)
    setSchedules(prev => [created, ...prev])
    return created
  }

  async function update(id: string, req: ScheduledMessageRequest): Promise<ScheduledMessage> {
    const updated = await updateSchedule(id, req)
    setSchedules(prev => prev.map(s => (s.id === id ? updated : s)))
    return updated
  }

  async function toggle(id: string, isActive: boolean): Promise<void> {
    const updated = await toggleSchedule(id, isActive)
    setSchedules(prev => prev.map(s => (s.id === id ? updated : s)))
  }

  async function remove(id: string): Promise<void> {
    await deleteSchedule(id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  async function fetchHistory(id: string): Promise<ScheduledMessageLogEntry[]> {
    return getScheduleHistory(id)
  }

  return { schedules, loading, error, create, update, toggle, remove, fetchHistory, reload: load }
}
