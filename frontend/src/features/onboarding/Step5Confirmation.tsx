import type { OnboardingData } from './useOnboarding'

interface Props {
  data: Partial<OnboardingData>
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
}

export default function Step5Confirmation({ data, onBack, onSubmit, submitting, error }: Props) {
  return (
    <div className="space-y-6">
      <section className="bg-gray-700/50 rounded-lg p-4 space-y-2">
        <h3 className="text-gray-200 font-semibold text-sm">Profile</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-gray-400">Name</dt>
          <dd className="text-white">{data.displayName ?? '—'}</dd>
          <dt className="text-gray-400">Currency</dt>
          <dd className="text-white">{data.preferredCurrency ?? '—'}</dd>
          <dt className="text-gray-400">Goal</dt>
          <dd className="text-white">{data.investmentGoal || '—'}</dd>
          <dt className="text-gray-400">Time horizon</dt>
          <dd className="text-white">{data.timeHorizonYears ? `${data.timeHorizonYears} years` : '—'}</dd>
          <dt className="text-gray-400">Monthly range</dt>
          <dd className="text-white">
            {data.monthlyInvestmentMin ?? 0} – {data.monthlyInvestmentMax ?? 0}
          </dd>
          <dt className="text-gray-400">Tracks</dt>
          <dd className="text-white">{(data.tracksEnabled ?? []).join(', ') || '—'}</dd>
        </dl>
      </section>

      <section className="bg-gray-700/50 rounded-lg p-4 space-y-2">
        <h3 className="text-gray-200 font-semibold text-sm">Target Allocations</h3>
        {(data.allocations ?? []).length === 0 ? (
          <p className="text-gray-500 text-sm">None</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-600">
                <th className="text-left py-1 pr-2">Symbol</th>
                <th className="text-left py-1 pr-2">Type</th>
                <th className="text-left py-1 pr-2">Label</th>
                <th className="text-right py-1">%</th>
              </tr>
            </thead>
            <tbody>
              {(data.allocations ?? []).map(a => (
                <tr key={a.symbol} className="border-b border-gray-700/50 text-gray-300">
                  <td className="py-1 pr-2 font-mono">{a.symbol}</td>
                  <td className="py-1 pr-2">{a.assetType}</td>
                  <td className="py-1 pr-2">{a.label}</td>
                  <td className="py-1 text-right">{a.targetPercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-gray-700/50 rounded-lg p-4 space-y-1">
        <h3 className="text-gray-200 font-semibold text-sm">Initial Holdings</h3>
        <p className="text-sm text-gray-300">
          {(data.initialHoldings ?? []).length === 0
            ? 'None'
            : `${data.initialHoldings!.length} holding${data.initialHoldings!.length !== 1 ? 's' : ''} will be logged`}
        </p>
      </section>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-40"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </button>
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting && (
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {submitting ? 'Setting up…' : 'Confirm & Start'}
        </button>
      </div>
    </div>
  )
}
