// frontend/src/features/briefing/BriefingNarrative.tsx
import { Sparkles } from 'lucide-react'
import type { DailyBriefingResponse } from '@/api/briefing'

interface Props {
  data: DailyBriefingResponse
}

export function BriefingNarrative({ data }: Props) {
  if (!data.briefingText) return null

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-purple-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">AI Summary</h3>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
        {data.briefingText}
      </p>
    </div>
  )
}
