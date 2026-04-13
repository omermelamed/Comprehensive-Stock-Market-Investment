import client from './client'
import type { UserProfile } from '../types'

export const getProfile = () => client.get<UserProfile>('/api/profile').then(r => r.data)
export const createProfile = (data: unknown) => client.post<UserProfile>('/api/profile', data).then(r => r.data)
export const updateProfile = (data: unknown) => client.put<UserProfile>('/api/profile', data).then(r => r.data)
export const completeOnboarding = () => client.post<UserProfile>('/api/profile/complete-onboarding').then(r => r.data)
export const sendWhatsAppTest = () => client.post<{ status: string; to: string }>('/api/whatsapp/test').then(r => r.data)
