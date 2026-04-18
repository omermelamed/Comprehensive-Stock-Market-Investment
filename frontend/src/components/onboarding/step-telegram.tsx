import { useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'
import { discoverTelegramChat } from '@/api/profile'
import { SectionHeader } from '@/components/shared/section-header'
import { StepFooter } from './step-footer'

interface StepTelegramProps {
  value: string
  onValueChange: (v: string) => void
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  onContinue: () => void
  onBack?: () => void
}

export function StepTelegram({ value, onValueChange, enabled, onEnabledChange, onContinue, onBack }: StepTelegramProps) {
  const [linking, setLinking] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const linked = value.trim() !== ''

  async function handleLink() {
    setLinking(true)
    setError(null)
    try {
      const { chatId } = await discoverTelegramChat()
      onValueChange(chatId)
      onEnabledChange(true)
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: string } } })?.response
      setError(resp?.data?.error ?? 'Could not find your chat. Send /start to your bot first.')
    } finally {
      setLinking(false)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Telegram notifications"
        description="Get a summary on Telegram every time you confirm a monthly investment."
      />

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#229ED915] text-[#229ED9]">
          <Send className="h-4 w-4" />
        </div>
        <div className="text-xs text-muted-foreground">
          Open Telegram and send <span className="font-mono text-foreground">/start</span> to your bot, then click "Link Bot" below.
        </div>
      </div>

      {!linked ? (
        <div className="space-y-3">
          <button
            type="button"
            disabled={linking}
            onClick={() => void handleLink()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {linking ? 'Linking…' : 'Link Telegram Bot'}
          </button>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Bot linked (chat {value})
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => onEnabledChange(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                enabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm text-foreground">
              {enabled ? 'Enable Telegram notifications' : 'Keep disabled for now'}
            </span>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Optional — you can skip this and link later in Settings.
      </p>

      <StepFooter
        onContinue={onContinue}
        onBack={onBack}
        continueLabel={linked ? 'Continue' : 'Skip'}
      />
    </div>
  )
}
