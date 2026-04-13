import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Trash2, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type { useChatPanel } from './useChatPanel'

type ChatPanelProps = ReturnType<typeof useChatPanel>

export function ChatPanel(props: ChatPanelProps) {
  const { messages, isOpen, isLoading, sendMessage, togglePanel, clearConversation } = props
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    if (!inputText.trim()) return
    sendMessage(inputText)
    setInputText('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={togglePanel}
        aria-label="Toggle AI chat"
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors',
          'bg-purple-600 text-white hover:bg-purple-500',
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>

      {/* Slide-in panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className={cn(
              'fixed bottom-0 right-0 top-0 z-30 flex w-[420px] flex-col',
              'border-l border-purple-500/30 bg-card shadow-2xl',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-purple-500/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-semibold text-foreground">Portfolio AI</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearConversation}
                  aria-label="Clear conversation"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={togglePanel}
                  aria-label="Close chat"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Message thread */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 && !isLoading && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <Bot className="h-10 w-10 text-purple-400/50" />
                  <p className="text-sm text-muted-foreground">
                    Ask me anything about your portfolio, allocation strategy, or market conditions.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="max-w-[85%] rounded-lg border-l-2 border-purple-500/60 bg-muted px-3 py-2 text-sm text-foreground">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="mb-1 ml-4 list-disc">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-1 ml-4 list-decimal">{children}</ol>,
                            code: ({ children }) => (
                              <code className="rounded bg-background px-1 font-mono text-xs">
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="max-w-[85%] rounded-lg bg-purple-600 px-3 py-2 text-sm text-white">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg border-l-2 border-purple-500/60 bg-muted px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input bar */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your portfolio..."
                  rows={1}
                  className={cn(
                    'flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2',
                    'text-sm text-foreground placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-1 focus:ring-purple-500/50',
                    'max-h-32 overflow-y-auto',
                  )}
                  style={{ height: 'auto' }}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  aria-label="Send message"
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                    'bg-purple-600 text-white hover:bg-purple-500',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
