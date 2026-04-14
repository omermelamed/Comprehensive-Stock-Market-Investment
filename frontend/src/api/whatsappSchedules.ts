import client from './client'

export type MessageType =
  | 'PORTFOLIO_SUMMARY'
  | 'PERFORMANCE_REPORT'
  | 'ALLOCATION_CHECK'
  | 'INVESTMENT_REMINDER'
  | 'TOP_MOVERS'

export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export interface ScheduledMessage {
  id: string
  messageType: MessageType
  label: string
  frequency: Frequency
  dayOfWeek: number | null
  biweeklyWeek: number | null
  dayOfMonth: number | null
  sendTime: string
  isActive: boolean
  lastSentAt: string | null
  nextSendAt: string
  sendCount: number
  createdAt: string
}

export interface ScheduledMessageLogEntry {
  id: string
  sentAt: string
  status: 'SENT' | 'FAILED'
  errorMessage: string | null
  twilioSid: string | null
}

export interface ScheduledMessageRequest {
  messageType: MessageType
  label: string
  frequency: Frequency
  dayOfWeek: number | null
  biweeklyWeek: number | null
  dayOfMonth: number | null
  sendTime: string
}

const BASE = '/api/whatsapp/schedules'

export const listSchedules = () =>
  client.get<ScheduledMessage[]>(BASE).then(r => r.data)

export const createSchedule = (req: ScheduledMessageRequest) =>
  client.post<ScheduledMessage>(BASE, req).then(r => r.data)

export const updateSchedule = (id: string, req: ScheduledMessageRequest) =>
  client.put<ScheduledMessage>(`${BASE}/${id}`, req).then(r => r.data)

export const toggleSchedule = (id: string, isActive: boolean) =>
  client.patch<ScheduledMessage>(`${BASE}/${id}/toggle`, { isActive }).then(r => r.data)

export const deleteSchedule = (id: string) =>
  client.delete(`${BASE}/${id}`)

export const getScheduleHistory = (id: string) =>
  client.get<ScheduledMessageLogEntry[]>(`${BASE}/${id}/history`).then(r => r.data)
