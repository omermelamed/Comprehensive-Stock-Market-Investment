import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, X, Trash2, Send, Zap,
  Briefcase, BarChart2, TrendingUp, PieChart,
  Target, Shield, Newspaper, Activity, Receipt,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { CHAT_ACTIONS, type ChatAction } from './chatActions'
import type { useChatPanel } from './useChatPanel'

type ChatPanelProps = ReturnType<typeof useChatPanel>

const ICON_MAP: Record<string, React.ElementType> = {
  'briefcase': Briefcase,
  'bar-chart': BarChart2,
  'trending-up': TrendingUp,
  'pie-chart': PieChart,
  'target': Target,
  'shield': Shield,
  'newspaper': Newspaper,
  'activity': Activity,
  'receipt': Receipt,
}

const CATEGORY_LABELS: Record<string, string> = {
  portfolio: 'Portfolio',
  risk: 'Risk',
  market: 'Market',
  planning: 'Planning',
}

function ActionGrid({ onAction, disabled }: { onAction: (a: ChatAction) => void; disabled: boolean }) {
  const grouped = CHAT_ACTIONS.reduce<Record<string, ChatAction[]>>((acc, action) => {
    ;(acc[action.category] ??= []).push(action)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, actions]) => (
        <div key={category}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {CATEGORY_LABELS[category] ?? category}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {actions.map(action => {
              const Icon = ICON_MAP[action.icon] ?? Zap
              return (
                <button
                  key={action.id}
                  onClick={() => onAction(action)}
                  disabled={disabled}
                  className={cn(
                    'group flex flex-col items-start gap-1 rounded-lg border border-border/50 bg-background/50 px-2.5 py-2 text-left transition-all',
                    'hover:border-purple-500/40 hover:bg-purple-500/5',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-purple-400/70 transition-colors group-hover:text-purple-400" />
                    <span className="text-xs font-medium text-foreground">{action.label}</span>
                  </div>
                  <span className="text-[10px] leading-tight text-muted-foreground/70">{action.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChatPanel(props: ChatPanelProps) {
  const { messages, isOpen, isLoading, sendMessage, executeAction, togglePanel, clearConversation } = props
  const [inputText, setInputText] = useState('')
  const [showActions, setShowActions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (!isOpen) setShowActions(false)
  }, [isOpen])

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

  const handleAction = (action: ChatAction) => {
    setShowActions(false)
    executeAction(action)
  }

  const isEmpty = messages.length === 0 && !isLoading

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={togglePanel}
        aria-label="Toggle AI chat"
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors',
          'bg-violet-500 text-white hover:opacity-90',
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
                <span className="text-sm font-semibold text-foreground">Portfolio Assistant</span>
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

            {/* Message thread / empty state */}
            <div className="flex-1 overflow-y-auto p-4">
              {isEmpty && !showActions && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
                    <Zap className="h-7 w-7 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Quick Actions</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Get instant portfolio insights — no AI key required
                    </p>
                  </div>
                  <div className="w-full">
                    <ActionGrid onAction={handleAction} disabled={isLoading} />
                  </div>
                </div>
              )}

              {isEmpty && showActions && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Choose an action</p>
                    <button
                      onClick={() => setShowActions(false)}
                      className="text-xs text-muted-foreground/70 hover:text-foreground"
                    >
                      Back
                    </button>
                  </div>
                  <ActionGrid onAction={handleAction} disabled={isLoading} />
                </div>
              )}

              {!isEmpty && (
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
                              table: ({ children }) => (
                                <div className="my-1 overflow-x-auto">
                                  <table className="w-full text-xs">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
                              th: ({ children }) => (
                                <th className="px-1.5 py-1 text-left font-semibold text-muted-foreground">{children}</th>
                              ),
                              td: ({ children }) => <td className="px-1.5 py-0.5">{children}</td>,
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
                        <div className="max-w-[85%] rounded-lg bg-violet-500 px-3 py-2 text-sm text-white">
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
              )}

              {/* Inline actions toggle when conversation exists */}
              {!isEmpty && !isLoading && !showActions && (
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={() => setShowActions(true)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs',
                      'text-muted-foreground transition-all hover:border-purple-500/40 hover:text-purple-400',
                    )}
                  >
                    <Zap className="h-3 w-3" />
                    More actions
                  </button>
                </div>
              )}

              {!isEmpty && showActions && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Choose an action</p>
                    <button
                      onClick={() => setShowActions(false)}
                      className="text-xs text-muted-foreground/70 hover:text-foreground"
                    >
                      Hide
                    </button>
                  </div>
                  <ActionGrid onAction={handleAction} disabled={isLoading} />
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setShowActions(v => !v)}
                  disabled={isLoading}
                  title="Quick actions"
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border transition-colors',
                    showActions
                      ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                      : 'text-muted-foreground hover:border-purple-500/30 hover:text-purple-400',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                >
                  <Zap className="h-4 w-4" />
                </button>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message or use quick actions..."
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
                    'bg-violet-500 text-white hover:opacity-90',
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
