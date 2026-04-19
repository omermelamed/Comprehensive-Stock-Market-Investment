// frontend/src/pages/BriefingPage.tsx
import { motion } from 'framer-motion'
import { stagger, staggerItem } from '@/lib/motion'
import { useBriefing } from '@/features/briefing/useBriefing'
import { BriefingHero } from '@/features/briefing/BriefingHero'
import { BriefingGrid } from '@/features/briefing/BriefingGrid'
import { BriefingNews } from '@/features/briefing/BriefingNews'
import { BriefingNarrative } from '@/features/briefing/BriefingNarrative'

function BriefingPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

export default function BriefingPage() {
  const { data, loading, error } = useBriefing()

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-foreground">Daily Briefing</h1>
        {data && (
          <p className="text-xs text-muted-foreground mt-0.5">{data.date}</p>
        )}
      </div>

      <div className="p-6">
        {loading && <BriefingPageSkeleton />}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {data && (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <motion.div variants={staggerItem}>
              <BriefingHero data={data} />
            </motion.div>

            <motion.div variants={staggerItem}>
              <BriefingGrid data={data} />
            </motion.div>

            <motion.div variants={staggerItem}>
              <BriefingNews data={data} />
            </motion.div>

            <motion.div variants={staggerItem}>
              <BriefingNarrative data={data} />
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
