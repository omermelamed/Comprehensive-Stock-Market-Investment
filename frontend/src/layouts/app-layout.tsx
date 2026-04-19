import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  PieChart,
  User,
  Sun,
  Moon,
  Star,
  Lightbulb,
  BarChart2,
  ShieldAlert,
  Layers,
  Bell,
  Upload,
  Newspaper,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { ChatPanel } from '@/features/chat/ChatPanel'
import { useChatPanel } from '@/features/chat/useChatPanel'
import { useAlertBadge } from '@/features/alerts/useAlertBadge'
import { AllocaLogo } from '@/components/shared/AllocaLogo'

interface AppLayoutProps {
  tracksEnabled?: string[]
}

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

function NavSection({ group, alertCount }: { group: NavGroup; alertCount: number }) {
  return (
    <div className="mb-1">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
        {group.label}
      </p>
      {group.items.map(({ to, label, icon: Icon, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary/12 text-primary'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70',
                )}
              />
              <span className="flex-1 truncate">{label}</span>
              {to === '/alerts' && alertCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
              {badge != null && badge > 0 && to !== '/alerts' && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-semibold leading-none text-primary">
                  {badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}

export function AppLayout({ tracksEnabled = [] }: AppLayoutProps) {
  const { theme, toggle } = useTheme()
  const chatPanel = useChatPanel()
  const { count: alertBadgeCount } = useAlertBadge()

  const optionsEnabled = tracksEnabled.includes('OPTIONS')

  const navGroups: NavGroup[] = [
    {
      label: 'Portfolio',
      items: [
        { to: '/',               label: 'Dashboard',    icon: LayoutDashboard, end: true },
        { to: '/briefing',       label: 'Briefing',     icon: Newspaper },
        { to: '/monthly-flow',   label: 'Monthly Flow', icon: TrendingUp },
        { to: '/allocations',    label: 'Allocations',  icon: PieChart },
        { to: '/transactions/new', label: 'Transactions', icon: ArrowLeftRight },
      ],
    },
    {
      label: 'Research',
      items: [
        { to: '/watchlist',       label: 'Watchlist',       icon: Star },
        { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
        { to: '/analytics',       label: 'Analytics',       icon: BarChart2 },
        ...(optionsEnabled ? [{ to: '/options', label: 'Options', icon: Layers }] : []),
      ],
    },
    {
      label: 'Monitoring',
      items: [
        { to: '/risk',   label: 'Risk',   icon: ShieldAlert },
        { to: '/alerts', label: 'Alerts', icon: Bell },
      ],
    },
  ]

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-full">

          {/* Logo */}
          <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
            <AllocaLogo className="h-6 w-auto text-sidebar-foreground" />
          </div>

          {/* Nav groups */}
          <nav className="flex flex-col gap-3 overflow-y-auto p-3 pt-4">
            {navGroups.map(group => (
              <NavSection key={group.label} group={group} alertCount={alertBadgeCount} />
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="mt-auto border-t border-sidebar-border p-3 space-y-0.5">
            <NavLink
              to="/import"
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/12 text-primary'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                )
              }
            >
              <Upload className="h-4 w-4 shrink-0 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70" />
              <span>Import</span>
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/12 text-primary'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                )
              }
            >
              <User className="h-4 w-4 shrink-0 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70" />
              <span>Profile</span>
            </NavLink>
            <button
              onClick={toggle}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              {theme === 'dark'
                ? <Sun className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
                : <Moon className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
              }
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </aside>

        {/* Main content — scrolls independently */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>

      {/* Chat panel — persists across routes */}
      <ChatPanel {...chatPanel} />
    </>
  )
}
