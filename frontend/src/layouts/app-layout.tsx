import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, TrendingUp, PieChart, User, Sun, Moon, Star, Lightbulb, MessageCircle, BarChart2, ShieldAlert, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { useChatPanel } from '@/features/chat/useChatPanel'
import { ChatPanel } from '@/features/chat/ChatPanel'
import { ChatContext } from '@/contexts/chat-context'
import { useEffect, useState } from 'react'
import { getProfile } from '@/api/profile'

const PAGE_CHAT_CONTEXT: Record<string, string> = {
  '/monthly-flow': 'Ask about your monthly allocation',
  '/watchlist': 'Ask about your watchlist',
  '/recommendations': 'Ask about these recommendations',
  '/': 'Ask about your portfolio',
}

function getChatContext(pathname: string): string {
  for (const [prefix, label] of Object.entries(PAGE_CHAT_CONTEXT)) {
    if (prefix === '/' ? pathname === '/' : pathname.startsWith(prefix)) return label
  }
  return 'Ask your portfolio assistant'
}

const BASE_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/monthly-flow', label: 'Monthly Flow', icon: TrendingUp, end: false },
  { to: '/recommendations', label: 'Recommendations', icon: Lightbulb, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart2, end: false },
  { to: '/risk', label: 'Risk', icon: ShieldAlert, end: false },
  { to: '/transactions/new', label: 'Transactions', icon: ArrowLeftRight, end: false },
  { to: '/allocations', label: 'Allocations', icon: PieChart, end: false },
  { to: '/watchlist', label: 'Watchlist', icon: Star, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
]

const OPTIONS_NAV = { to: '/options', label: 'Options', icon: Layers, end: false }

export function AppLayout() {
  const { theme, toggle } = useTheme()
  const chat = useChatPanel()
  const location = useLocation()
  const chatTooltip = getChatContext(location.pathname)
  const [optionsEnabled, setOptionsEnabled] = useState(false)

  useEffect(() => {
    getProfile()
      .then(p => setOptionsEnabled(p?.tracksEnabled?.some((t: string) => t.toUpperCase() === 'OPTIONS') ?? false))
      .catch(() => {})
  }, [])

  const NAV_ITEMS = optionsEnabled
    ? [...BASE_NAV.slice(0, 5), OPTIONS_NAV, ...BASE_NAV.slice(5)]
    : BASE_NAV

  return (
    <ChatContext.Provider value={{ openWithPrompt: chat.openWithPrompt }}>
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            Portfolio
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="mt-auto p-3 border-t border-sidebar-border">
          <button
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>

      {/* Floating chat button — bottom-20 to avoid overlapping sticky page footers */}
      {!chat.isOpen && (
        <button
          onClick={chat.open}
          title={chatTooltip}
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg transition-colors hover:bg-purple-700"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      <ChatPanel {...chat} pageContext={chatTooltip} />
    </div>
    </ChatContext.Provider>
  )
}
