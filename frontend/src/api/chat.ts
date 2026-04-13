import client from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
}

export async function postChatMessage(
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> {
  const res = await client.post<ChatResponse>('/api/chat', { message, history })
  return res.data
}
