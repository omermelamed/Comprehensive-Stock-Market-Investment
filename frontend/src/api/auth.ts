import client from './client'

export interface AuthUser {
  userId: string
  email: string
}

export interface MessageResponse {
  message: string
}

export const login = (email: string, password: string) =>
  client.post<AuthUser>('/api/auth/login', { email, password })

export const register = (email: string, password: string) =>
  client.post<MessageResponse>('/api/auth/register', { email, password })

export const logout = () => client.post('/api/auth/logout')

export const getMe = () => client.get<AuthUser>('/api/auth/me')

export const verifyEmail = (token: string) =>
  client.post<MessageResponse>('/api/auth/verify-email', { token })

export const resendVerification = (email: string) =>
  client.post<MessageResponse>('/api/auth/resend-verification', { email })

export const forgotPassword = (email: string) =>
  client.post<MessageResponse>('/api/auth/forgot-password', { email })

export const resetPassword = (token: string, newPassword: string) =>
  client.post<MessageResponse>('/api/auth/reset-password', { token, newPassword })
