import { useState, useCallback } from 'react'
import { postChatMessage, type ChatMessage } from '@/api/chat'

interface ChatPanelState {
  messages: ChatMessage[]
  isOpen: boolean
  isLoading: boolean
  sendMessage: (text: string) => Promise<void>
  togglePanel: () => void
  clearConversation: () => void
}

export function useChatPanel(): ChatPanelState {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setIsLoading(true)

    try {
      const { reply } = await postChatMessage(trimmed, messages)
      setMessages([...nextHistory, { role: 'assistant', content: reply }])
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'Failed to get a response'
      setMessages([
        ...nextHistory,
        { role: 'assistant', content: `Error: ${errorText}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const togglePanel = useCallback(() => {
    setIsOpen(v => !v)
  }, [])

  const clearConversation = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, isOpen, isLoading, sendMessage, togglePanel, clearConversation }
}
