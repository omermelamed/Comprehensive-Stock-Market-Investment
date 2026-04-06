import client from './client'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
}

export const sendChatMessage = (message: string, history: ChatTurn[]): Promise<ChatResponse> =>
  client.post<ChatResponse>('/api/chat', { message, history }).then(r => r.data)
