import { useEffect, useState } from 'react'
import { getProfile, updateProfile, sendTelegramTest, discoverTelegramChat } from '@/api/profile'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { UserProfile } from '@/types'
import { ASSET_TRACKS } from '@/data/onboarding'
import { useCurrency } from '@/contexts/currency-context'
import { getCurrencySymbol } from '@/lib/currency'
import { ScheduledMessagesList } from '@/features/telegram/ScheduledMessagesList'

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

  // Telegram
  const [telegramChatId, setTelegramChatId]     = useState('')
  const [telegramEnabled, setTelegramEnabled]   = useState(false)
  const [testSending, setTestSending]           = useState(false)
  const [testResult, setTestResult]             = useState<string | null>(null)
  const [tgSaving, setTgSaving]                 = useState(false)
  const [tgSaved, setTgSaved]                   = useState(false)
  const [linking, setLinking]                   = useState(false)

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
        setTelegramChatId(p.telegramChatId ?? '')
        setTelegramEnabled(p.telegramEnabled ?? false)
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
        telegramChatId: telegramChatId || null,
        telegramEnabled,
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

  async function handleSaveTelegram() {
    if (!profile) return
    setTgSaving(true)
    setTgSaved(false)
    setTestResult(null)
    try {
      const updated = await updateProfile({
        displayName,
        preferredCurrency: currency,
        investmentGoal: goal,
        timeHorizonYears: horizonYears,
        monthlyInvestmentMin: budgetMin,
        monthlyInvestmentMax: budgetMax,
        tracksEnabled: tracks,
        questionnaireAnswers: profile.questionnaireAnswers ?? {},
        theme: profile.theme ?? 'DARK',
        timezone,
        telegramChatId: telegramChatId || null,
        telegramEnabled,
      })
      setProfile(updated)
      setTgSaved(true)
      setTimeout(() => setTgSaved(false), 3000)
    } catch {
      setTestResult('Failed to save Telegram settings.')
    } finally {
      setTgSaving(false)
    }
  }

  async function handleSendTestTelegram() {
    if (!telegramChatId) {
      setTestResult('Link your Telegram bot first.')
      return
    }
    setTestSending(true)
    setTestResult(null)
    try {
      const result = await sendTelegramTest()
      setTestResult(`Test message sent to chat ${result.to}`)
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: string } } })?.response
      const msg = resp?.data?.error ?? 'Failed to send test message. Check your chat ID and bot token.'
      setTestResult(msg)
    } finally {
      setTestSending(false)
    }
  }

  async function handleLinkBot() {
    setLinking(true)
    setTestResult(null)
    try {
      const { chatId } = await discoverTelegramChat()
      setTelegramChatId(chatId)
      setTelegramEnabled(true)
      const refreshed = await getProfile()
      setProfile(refreshed)
      setTelegramChatId(refreshed.telegramChatId ?? chatId)
      setTelegramEnabled(refreshed.telegramEnabled ?? true)
      setTestResult('Bot linked successfully!')
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: string } } })?.response
      setTestResult(resp?.data?.error ?? 'Could not find your chat. Send /start to your bot on Telegram first.')
    } finally {
      setLinking(false)
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
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Profile</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-5">

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

          {/* Telegram section */}
          <Card>
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Telegram Bot</h2>
                {telegramChatId ? (
                  <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">Linked</span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Not linked</span>
                )}
              </div>

              <div className="space-y-4">
                {!telegramChatId ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Send <span className="font-mono text-foreground">/start</span> to your bot on Telegram, then click below to link it.
                    </p>
                    <button
                      type="button"
                      disabled={linking}
                      onClick={() => void handleLinkBot()}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {linking ? 'Linking…' : 'Link Telegram Bot'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                      Chat ID: <span className="font-mono">{telegramChatId}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={telegramEnabled}
                        onClick={() => setTelegramEnabled(prev => !prev)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          telegramEnabled ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                            telegramEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-sm text-foreground">
                        {telegramEnabled ? 'Bot enabled' : 'Bot disabled'}
                      </span>
                    </div>

                    {tgSaved && (
                      <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                        Telegram settings saved.
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={tgSaving}
                        onClick={() => void handleSaveTelegram()}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {tgSaving ? 'Saving…' : 'Save Telegram Settings'}
                      </button>

                      <button
                        type="button"
                        disabled={testSending}
                        onClick={() => void handleSendTestTelegram()}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {testSending ? 'Sending…' : 'Send Test Message'}
                      </button>
                    </div>
                  </>
                )}

                {testResult && (
                  <div className={`rounded-lg border px-4 py-3 text-sm ${
                    testResult.includes('success') || testResult.startsWith('Test message sent')
                      ? 'border-success/30 bg-success/10 text-success'
                      : 'border-destructive/40 bg-destructive/10 text-destructive'
                  }`}>
                    {testResult}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Telegram Messages */}
          {(profile?.telegramEnabled || telegramEnabled) && (
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
