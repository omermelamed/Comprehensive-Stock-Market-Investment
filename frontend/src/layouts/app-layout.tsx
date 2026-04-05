import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, TrendingUp, PieChart, User, Sun, Moon, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/monthly-flow', label: 'Monthly Flow', icon: TrendingUp, end: false },
  { to: '/transactions/new', label: 'Transactions', icon: ArrowLeftRight, end: false },
  { to: '/allocations', label: 'Allocations', icon: PieChart, end: false },
  { to: '/watchlist', label: 'Watchlist', icon: Star, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
]

export function AppLayout() {
  const { theme, toggle } = useTheme()

  return (
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
    </div>
  )
}
