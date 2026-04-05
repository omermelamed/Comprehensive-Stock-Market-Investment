import type { TargetAllocation } from '../../types'

interface Props {
  value: string
  onChange: (v: string) => void
  allocations: TargetAllocation[]
}

const DATALIST_ID = 'symbol-suggestions'

export default function SymbolAutocomplete({ value, onChange, allocations }: Props) {
  return (
    <>
      <input
        type="text"
        list={DATALIST_ID}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase())}
        placeholder="e.g. VOO"
      />
      <datalist id={DATALIST_ID}>
        {allocations.map(a => (
          <option key={a.id} value={a.symbol}>
            {a.label}
          </option>
        ))}
      </datalist>
    </>
  )
}
