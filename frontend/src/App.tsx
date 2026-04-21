import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { getProfile } from './api/profile'
import type { UserProfile } from './types'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import VerifyEmailPage from './features/auth/VerifyEmailPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import OnboardingPage from './pages/OnboardingPage'
import TransactionFormPage from './pages/TransactionFormPage'
import DashboardPage from './pages/DashboardPage'
import MonthlyFlowPage from './pages/MonthlyFlowPage'
import ProfilePage from './pages/ProfilePage'
import AllocationPage from './pages/AllocationPage'
import WatchlistPage from './pages/WatchlistPage'
import AnalyticsPage from './pages/AnalyticsPage'
import RiskPage from './pages/RiskPage'
import OptionsPage from './pages/OptionsPage'
import OptionsTransactionFormPage from './pages/OptionsTransactionFormPage'
import AlertsPage from './pages/AlertsPage'
import ImportPage from './pages/ImportPage'
import BriefingPage from './pages/BriefingPage'
import { AppLayout } from './layouts/app-layout'
import { CurrencyProvider } from './contexts/currency-context'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
          <h1 className="text-xl font-bold text-destructive">Something went wrong</h1>
          <pre className="max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-xs text-destructive">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AuthenticatedApp() {
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined)

  useEffect(() => {
    getProfile()
      .then(p => setProfile(p))
      .catch(() => setProfile(null))
  }, [])

  if (profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    )
  }

  const needsOnboarding = !profile || !profile.onboardingCompleted

  return (
    <CurrencyProvider currency={profile?.preferredCurrency ?? 'USD'}>
      <Routes>
        <Route path="/onboarding" element={needsOnboarding ? <OnboardingPage onComplete={setProfile} /> : <Navigate to="/" replace />} />
        <Route
          element={
            needsOnboarding
              ? <Navigate to="/onboarding" replace />
              : <AppLayout tracksEnabled={profile?.tracksEnabled ?? []} />
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/briefing" element={<BriefingPage />} />
          <Route path="/transactions/new" element={<TransactionFormPage />} />
          <Route path="/monthly-flow" element={<MonthlyFlowPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/allocations" element={<AllocationPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/options" element={<OptionsPage />} />
          <Route path="/options/new" element={<OptionsTransactionFormPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CurrencyProvider>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AuthenticatedApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
