import { useState } from 'react'
import type { OnboardingData } from './useOnboarding'

const TRACKS = [
  { value: 'LONG_EQUITY', label: 'Long Equity', alwaysOn: true },
  { value: 'SHORT', label: 'Short', alwaysOn: false },
  { value: 'CRYPTO', label: 'Crypto', alwaysOn: false },
  { value: 'OPTIONS', label: 'Options', alwaysOn: false },
  { value: 'REIT', label: 'REIT', alwaysOn: false },
  { value: 'BOND', label: 'Bonds', alwaysOn: false },
]

interface Props {
  data: Partial<OnboardingData>
  onUpdate: (patch: Partial<OnboardingData>) => void
  onNext: () => void
}

export default function Step1BasicInfo({ data, onUpdate, onNext }: Props) {
  const [displayName, setDisplayName] = useState(data.displayName ?? '')
  const [preferredCurrency, setPreferredCurrency] = useState(data.preferredCurrency ?? 'USD')
  const [investmentGoal, setInvestmentGoal] = useState(data.investmentGoal ?? '')
  const [timeHorizonYears, setTimeHorizonYears] = useState(data.timeHorizonYears ?? 10)
  const [monthlyInvestmentMin, setMonthlyInvestmentMin] = useState(data.monthlyInvestmentMin ?? 0)
  const [monthlyInvestmentMax, setMonthlyInvestmentMax] = useState(data.monthlyInvestmentMax ?? 0)
  const [tracksEnabled, setTracksEnabled] = useState<string[]>(
    data.tracksEnabled ?? ['LONG_EQUITY']
  )

  function toggleTrack(value: string) {
    setTracksEnabled(prev =>
      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
    )
  }

  function handleNext() {
    onUpdate({
      displayName,
      preferredCurrency,
      investmentGoal,
      timeHorizonYears,
      monthlyInvestmentMin,
      monthlyInvestmentMax,
      tracksEnabled,
    })
    onNext()
  }

  const inputClass =
    'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 w-full text-white focus:outline-none focus:border-blue-500'
  const labelClass = 'text-gray-400 text-sm block mb-1'

  return (
    <div className="space-y-6">
      <div>
        <label className={labelClass}>Display Name *</label>
        <input
          type="text"
          className={inputClass}
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="e.g. John"
        />
      </div>

      <div>
        <label className={labelClass}>Preferred Currency</label>
        <select
          className={inputClass}
          value={preferredCurrency}
          onChange={e => setPreferredCurrency(e.target.value)}
        >
          <option value="USD">USD</option>
          <option value="ILS">ILS</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Investment Goal</label>
        <textarea
          className={inputClass}
          rows={3}
          value={investmentGoal}
          onChange={e => setInvestmentGoal(e.target.value)}
          placeholder="e.g. Long-term wealth building for retirement"
        />
      </div>

      <div>
        <label className={labelClass}>Time Horizon (years)</label>
        <input
          type="number"
          className={inputClass}
          min={1}
          max={50}
          value={timeHorizonYears}
          onChange={e => setTimeHorizonYears(Number(e.target.value))}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className={labelClass}>Monthly Min ($)</label>
          <input
            type="number"
            className={inputClass}
            min={0}
            value={monthlyInvestmentMin}
            onChange={e => setMonthlyInvestmentMin(Number(e.target.value))}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Monthly Max ($)</label>
          <input
            type="number"
            className={inputClass}
            min={0}
            value={monthlyInvestmentMax}
            onChange={e => setMonthlyInvestmentMax(Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tracks Enabled</label>
        <div className="flex flex-wrap gap-3 mt-1">
          {TRACKS.map(track => (
            <label key={track.value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={tracksEnabled.includes(track.value)}
                disabled={track.alwaysOn}
                onChange={() => toggleTrack(track.value)}
                className="accent-blue-500"
              />
              {track.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleNext}
          disabled={displayName.trim() === ''}
        >
          Next
        </button>
      </div>
    </div>
  )
}
