import { Sparkles } from 'lucide-react'

interface RiskReasoningPanelProps {
  reasoning: string | undefined
}

export function RiskReasoningPanel({ reasoning }: RiskReasoningPanelProps) {
  if (!reasoning) return null

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-purple-400">
          AI Reasoning
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{reasoning}</p>
    </div>
  )
}
