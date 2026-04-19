// frontend/src/features/briefing/BriefingNews.tsx
import type { DailyBriefingResponse } from '@/api/briefing'

interface Props {
  data: DailyBriefingResponse
}

export function BriefingNews({ data }: Props) {
  if (data.newsHeadlines.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">News Headlines</h3>
      <ul className="space-y-2">
        {data.newsHeadlines.map((item, i) => (
          <li key={`${item.symbol}-${i}`} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
              {item.symbol}
            </span>
            <span className="text-foreground leading-snug">{item.headline}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
