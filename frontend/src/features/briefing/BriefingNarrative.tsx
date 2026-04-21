import { FileText } from 'lucide-react'
import type { DailyBriefingResponse } from '@/api/briefing'

interface Props {
  data: DailyBriefingResponse
}

export function BriefingNarrative({ data }: Props) {
  if (!data.briefingText) return null

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</h3>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
        {data.briefingText}
      </p>
    </div>
  )
}
