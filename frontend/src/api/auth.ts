import client from './client'

export interface AuthUser {
  userId: string
  username: string
}

export const login = (username: string, password: string) =>
  client.post<AuthUser>('/api/auth/login', { username, password })

export const register = (username: string, password: string) =>
  client.post<AuthUser>('/api/auth/register', { username, password })

export const logout = () => client.post('/api/auth/logout')

export const getMe = () => client.get<AuthUser>('/api/auth/me')
