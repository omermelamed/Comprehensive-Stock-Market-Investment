import { cn } from '@/lib/utils'

interface CenteredPageProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  maxWidth?: number
}

export function CenteredPage({ children, className, style, maxWidth = 520 }: CenteredPageProps) {
  return (
    <div className={cn('flex min-h-screen items-center justify-center px-4 py-10', className)} style={style}>
      <div className="w-full" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  )
}
