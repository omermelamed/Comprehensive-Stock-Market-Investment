import { createContext, useContext } from 'react'

interface ChatContextValue {
  openWithPrompt: (prompt: string) => void
}

export const ChatContext = createContext<ChatContextValue>({
  openWithPrompt: () => {},
})

export function useChatActions(): ChatContextValue {
  return useContext(ChatContext)
}
