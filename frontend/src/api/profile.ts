import client from './client'
import type { UserProfile } from '../types'

export const getProfile = () => client.get<UserProfile>('/api/profile').then(r => r.data)
export const createProfile = (data: unknown) => client.post<UserProfile>('/api/profile', data).then(r => r.data)
export const updateProfile = (data: unknown) => client.put<UserProfile>('/api/profile', data).then(r => r.data)
export const completeOnboarding = () => client.post<UserProfile>('/api/profile/complete-onboarding').then(r => r.data)
export const sendTelegramTest = () => client.post<{ status: string; to: string; messageId: string }>('/api/telegram/test').then(r => r.data)
export const discoverTelegramChat = () => client.get<{ chatId: string }>('/api/telegram/discover-chat').then(r => r.data)
