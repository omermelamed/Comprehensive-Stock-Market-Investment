import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { getProfile } from './api/profile'
import type { UserProfile } from './types'
import OnboardingPage from './pages/OnboardingPage'
import TransactionFormPage from './pages/TransactionFormPage'
import DashboardPage from './pages/DashboardPage'
import MonthlyFlowPage from './pages/MonthlyFlowPage'
import ProfilePage from './pages/ProfilePage'
import AllocationPage from './pages/AllocationPage'
import WatchlistPage from './pages/WatchlistPage'
import { AppLayout } from './layouts/app-layout'

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

function App() {
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
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={needsOnboarding ? <OnboardingPage onComplete={setProfile} /> : <Navigate to="/" replace />} />
          {/* App shell for authenticated routes */}
          <Route element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions/new" element={<TransactionFormPage />} />
            <Route path="/monthly-flow" element={<MonthlyFlowPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/allocations" element={<AllocationPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
