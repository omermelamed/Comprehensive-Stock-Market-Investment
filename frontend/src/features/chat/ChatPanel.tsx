import { useEffect, useRef } from 'react'
import { X, Send, BrainCircuit, RotateCcw } from 'lucide-react'
import Markdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type { useChatPanel } from './useChatPanel'

type ChatPanelProps = ReturnType<typeof useChatPanel> & { pageContext?: string }

export function ChatPanel({
  isOpen,
  close,
  clear,
  messages,
  input,
  setInput,
  send,
  isLoading,
  inputRef,
  handleKeyDown,
  pageContext,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={close}
      />

      {/* Panel */}
      <div className="fixed bottom-0 right-0 top-0 z-50 flex w-[400px] flex-col border-l border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-semibold text-foreground">Portfolio Assistant</span>
            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-500">
              {pageContext || 'Portfolio context active'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clear}
                title="Clear conversation"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={close}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BrainCircuit className="mb-3 h-8 w-8 text-purple-500/50" />
              <p className="text-sm font-medium text-foreground">Ask me about your portfolio</p>
              <p className="mt-1 text-xs text-muted-foreground">
                I can explain your holdings, analyze gaps, discuss concepts, and help you think through decisions.
              </p>
              <div className="mt-4 flex flex-col gap-2 w-full">
                {STARTER_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); setTimeout(() => inputRef.current?.focus(), 50) }}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="mr-2 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15">
                  <BrainCircuit className="h-3 w-3 text-purple-500" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-card-foreground',
                )}
              >
                {msg.role === 'assistant' ? (
                  <Markdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      code: ({ children }) => (
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
                      ),
                    }}
                  >
                    {msg.content}
                  </Markdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="mr-2 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15">
                <BrainCircuit className="h-3 w-3 text-purple-500" />
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your portfolio…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || isLoading}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Enter to send · Shift+Enter for new line · AI can make mistakes
          </p>
        </div>
      </div>
    </>
  )
}

const STARTER_PROMPTS = [
  'Which positions am I most underweight in?',
  'How diversified is my portfolio?',
  'Explain my current allocation gaps',
]
