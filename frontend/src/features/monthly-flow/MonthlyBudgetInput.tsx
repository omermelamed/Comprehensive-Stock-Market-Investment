import { useCurrency } from '@/contexts/currency-context'
import { getCurrencySymbol } from '@/lib/currency'

interface Props {
  budget: string
  onChange: (value: string) => void
  onPreview: () => void
  isLoading: boolean
}

export function MonthlyBudgetInput({ budget, onChange, onPreview, isLoading }: Props) {
  const sym = getCurrencySymbol(useCurrency())
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onPreview()
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {sym}
        </span>
        <input
          type="number"
          min="0"
          step="100"
          value={budget}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Monthly budget"
          className="w-48 rounded-lg border border-input bg-background py-2 pl-7 pr-3 tabular-nums font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>
      <button
        onClick={onPreview}
        disabled={isLoading || !budget}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Loading…' : 'Preview'}
      </button>
    </div>
  )
}
