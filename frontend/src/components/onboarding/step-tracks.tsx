import {
  TrendingUp, Coins, Building2, Shield, Settings, BarChart3,
} from 'lucide-react'
import { SelectableTile } from '@/components/shared/selectable-tile'
import { SectionHeader } from '@/components/shared/section-header'
import { StepFooter } from './step-footer'
import { ASSET_TRACKS } from '@/data/onboarding'

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, Coins, Building2, Shield, Settings, BarChart3,
}

interface StepTracksProps {
  tracks: string[]
  onTracksChange: (v: string[]) => void
  onContinue: () => void
  onBack?: () => void
}

export function StepTracks({ tracks, onTracksChange, onContinue, onBack }: StepTracksProps) {
  function toggle(v: string) {
    onTracksChange(
      tracks.includes(v) ? tracks.filter(t => t !== v) : [...tracks, v],
    )
  }

  return (
    <div>
      <SectionHeader title="What do you want to invest in?" />

      <div className="mb-6 grid grid-cols-2 gap-2.5">
        {ASSET_TRACKS.map(t => {
          const on = tracks.includes(t.value)
          const Icon = ICON_MAP[t.icon]
          return (
            <SelectableTile
              key={t.value}
              selected={on}
              onClick={() => toggle(t.value)}
              disabled={t.locked}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${t.color}15`, color: t.color }}
              >
                {Icon && <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-[11px] text-muted-foreground">{t.desc}</span>
              </div>
            </SelectableTile>
          )
        })}
      </div>

      <StepFooter onContinue={onContinue} onBack={onBack} />
    </div>
  )
}
