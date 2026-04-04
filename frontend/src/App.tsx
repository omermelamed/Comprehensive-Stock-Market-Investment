import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getProfile } from './api/profile'
import type { UserProfile } from './types'
import OnboardingPage from './pages/OnboardingPage'
import TransactionFormPage from './pages/TransactionFormPage'

function App() {
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined)

  useEffect(() => {
    getProfile()
      .then(p => setProfile(p))
      .catch(() => setProfile(null))
  }, [])

  if (profile === undefined) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>
  }

  const needsOnboarding = !profile || !profile.onboardingCompleted

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={needsOnboarding ? <OnboardingPage /> : <Navigate to="/" replace />} />
        <Route path="/transactions/new" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <TransactionFormPage />} />
        <Route path="/" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center text-xl">Dashboard coming in Phase 2</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
