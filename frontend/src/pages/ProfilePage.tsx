import { useEffect, useState } from 'react'
import { getProfile, updateProfile, sendWhatsAppTest } from '@/api/profile'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { UserProfile } from '@/types'
import { ASSET_TRACKS } from '@/data/onboarding'
import { useCurrency } from '@/contexts/currency-context'
import { getCurrencySymbol } from '@/lib/currency'
import { ScheduledMessagesList } from '@/features/whatsapp/ScheduledMessagesList'

const CURRENCIES = ['USD', 'ILS', 'EUR', 'GBP']
const GOALS = ['GROWTH', 'INCOME', 'PRESERVATION', 'SPECULATION']

const RISK_STYLES: Record<string, string> = {
  CONSERVATIVE: 'bg-success/15 text-success',
  MODERATE:     'bg-warning/15 text-warning',
  AGGRESSIVE:   'bg-destructive/15 text-destructive',
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'block text-sm font-medium text-muted-foreground mb-1.5'

export default function ProfilePage() {
  const sym = getCurrencySymbol(useCurrency())
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // form fields
  const [displayName, setDisplayName]   = useState('')
  const [currency, setCurrency]         = useState('USD')
  const [goal, setGoal]                 = useState('')
  const [horizonYears, setHorizonYears] = useState(10)
  const [budgetMin, setBudgetMin]       = useState(0)
  const [budgetMax, setBudgetMax]       = useState(0)
  const [tracks, setTracks]             = useState<string[]>([])

  // Timezone
  const [timezone, setTimezone] = useState('UTC')

  // WhatsApp
  const [whatsappNumber, setWhatsappNumber]   = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [testSending, setTestSending]         = useState(false)
  const [testResult, setTestResult]           = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then(p => {
        setProfile(p)
        setDisplayName(p.displayName)
        setCurrency(p.preferredCurrency)
        setGoal(p.investmentGoal)
        setHorizonYears(p.timeHorizonYears)
        setBudgetMin(p.monthlyInvestmentMin)
        setBudgetMax(p.monthlyInvestmentMax)
        setTracks(p.tracksEnabled)
        setTimezone(p.timezone ?? 'UTC')
        setWhatsappNumber(p.whatsappNumber ?? '')
        setWhatsappEnabled(p.whatsappEnabled ?? false)
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  function toggleTrack(track: string) {
    setTracks(prev =>
      prev.includes(track) ? prev.filter(t => t !== track) : [...prev, track]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await updateProfile({
        displayName,
        preferredCurrency: currency,
        investmentGoal: goal,
        timeHorizonYears: horizonYears,
        monthlyInvestmentMin: budgetMin,
        monthlyInvestmentMax: budgetMax,
        tracksEnabled: tracks,
        questionnaireAnswers: profile?.questionnaireAnswers ?? {},
        theme: profile?.theme ?? 'DARK',
        timezone,
        whatsappNumber: whatsappNumber || null,
        whatsappEnabled,
      })
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendTestWhatsApp() {
    setTestSending(true)
    setTestResult(null)
    try {
      const result = await sendWhatsAppTest()
      setTestResult(`Test message sent to ${result.to}`)
    } catch {
      setTestResult('Failed to send test message. Check your number and Twilio config.')
    } finally {
      setTestSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">View and update your investment preferences.</p>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Read-only info card */}
          {profile && (
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Account</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Level</p>
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${RISK_STYLES[profile.riskLevel] ?? 'bg-muted text-muted-foreground'}`}>
                      {profile.riskLevel}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Onboarding</p>
                    <Badge variant={profile.onboardingCompleted ? 'success' : 'warning'} className="mt-1">
                      {profile.onboardingCompleted ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Editable form */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preferences</h2>
              <form onSubmit={e => void handleSave(e)} className="space-y-5">

                <div>
                  <label className={labelClass}>Display Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Currency</label>
                    <select className={inputClass} value={currency} onChange={e => setCurrency(e.target.value)}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Investment Goal</label>
                    <select className={inputClass} value={goal} onChange={e => setGoal(e.target.value)}>
                      {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Timezone</label>
                  <select
                    className={inputClass}
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                  >
                    {[
                      'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
                      'America/Sao_Paulo','America/Argentina/Buenos_Aires','America/Toronto',
                      'Europe/London','Europe/Paris','Europe/Berlin','Europe/Rome','Europe/Madrid',
                      'Europe/Amsterdam','Europe/Stockholm','Europe/Warsaw','Europe/Athens','Europe/Istanbul',
                      'Asia/Jerusalem','Asia/Riyadh','Asia/Dubai','Africa/Cairo','Africa/Johannesburg',
                      'Asia/Kolkata','Asia/Singapore','Asia/Hong_Kong','Asia/Shanghai','Asia/Tokyo',
                      'Asia/Seoul','Australia/Sydney','Pacific/Auckland','UTC',
                    ].map(tz => (
                      <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Time Horizon (years)</label>
                  <input
                    type="number"
                    className={inputClass}
                    min={1}
                    max={50}
                    value={horizonYears}
                    onChange={e => setHorizonYears(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Monthly Budget Min</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{sym}</span>
                      <input
                        type="number"
                        className={`${inputClass} pl-7`}
                        min={0}
                        value={budgetMin}
                        onChange={e => setBudgetMin(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Monthly Budget Max</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{sym}</span>
                      <input
                        type="number"
                        className={`${inputClass} pl-7`}
                        min={0}
                        value={budgetMax}
                        onChange={e => setBudgetMax(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className={labelClass}>Active Tracks</p>
                  <div className="flex flex-wrap gap-2">
                    {ASSET_TRACKS.map(({ value, label }) => {
                      const active = tracks.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleTrack(value)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {saved && (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                    Profile saved successfully.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </CardContent>
          </Card>

          {/* WhatsApp section */}
          <Card>
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">WhatsApp Bot</h2>
                {whatsappEnabled && whatsappNumber ? (
                  <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">Connected</span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Not configured</span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Phone Number (E.164 format, e.g. +972501234567)</label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="+15551234567"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={whatsappEnabled}
                    onClick={() => setWhatsappEnabled(prev => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      whatsappEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                        whatsappEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-foreground">
                    {whatsappEnabled ? 'Bot enabled' : 'Bot disabled'}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Save your profile first to persist the number and enabled state, then use the test button to verify.
                </p>

                <button
                  type="button"
                  disabled={testSending || !whatsappNumber}
                  onClick={() => void handleSendTestWhatsApp()}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {testSending ? 'Sending…' : 'Send Test Message'}
                </button>

                {testResult && (
                  <div className={`rounded-lg border px-4 py-3 text-sm ${
                    testResult.startsWith('Failed')
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border-success/30 bg-success/10 text-success'
                  }`}>
                    {testResult}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scheduled WhatsApp Messages */}
          {(profile?.whatsappEnabled || whatsappEnabled) && (
            <Card>
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Scheduled Messages
                  </h2>
                </div>
                <ScheduledMessagesList />
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
