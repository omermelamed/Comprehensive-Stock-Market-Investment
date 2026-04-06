import { createContext, useContext } from 'react'

interface ChatActions {
  openWithPrompt: (prompt: string) => void
}

export const ChatContext = createContext<ChatActions>({ openWithPrompt: () => {} })

export function useChatActions() {
  return useContext(ChatContext)
}
