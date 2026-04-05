import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CenteredPage } from './centered-page'
import { useTheme } from '@/hooks/useTheme'
import { AllocaLogo } from '@/components/shared/AllocaLogo'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

const OB_BG: React.CSSProperties = {
  background: `
    radial-gradient(circle at 50% 35%, rgba(91, 90, 247, 0.12), transparent 55%),
    linear-gradient(180deg, #F7F9FC 0%, #EEF2F8 100%)
  `,
}

const CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 10px 25px rgba(0,0,0,0.04), 0 20px 50px rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.06)',
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const { theme, toggle } = useTheme()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CenteredPage style={OB_BG}>
        <div className="fixed top-5 left-6 text-foreground">
          <AllocaLogo className="h-8 w-auto" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Card style={CARD_STYLE}>
            <CardContent className="px-8 py-7">
              {children}
            </CardContent>
            <div className="flex justify-end px-4 py-2">
              <button
                onClick={toggle}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </Card>
        </motion.div>
      </CenteredPage>
    </motion.div>
  )
}
