import { useState, useRef, useCallback } from 'react'
import { sendChatMessage, type ChatTurn } from '@/api/chat'

export function useChatPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const open = useCallback(() => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userTurn: ChatTurn = { role: 'user', content: text }
    const historyBeforeSend = messages
    const optimisticMessages = [...messages, userTurn]

    setMessages(optimisticMessages)
    setInput('')
    setIsLoading(true)

    try {
      const { reply } = await sendChatMessage(text, historyBeforeSend)
      setMessages([...optimisticMessages, { role: 'assistant', content: reply }])
    } catch {
      setMessages([
        ...optimisticMessages,
        { role: 'assistant', content: 'Sorry, I ran into an error. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, isLoading, messages])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        send()
      }
    },
    [send],
  )

  return { isOpen, open, close, messages, input, setInput, send, isLoading, inputRef, handleKeyDown }
}
