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
        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 w-full text-white focus:outline-none focus:border-blue-500 uppercase"
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
