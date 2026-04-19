# Daily Briefing Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Daily Briefing surface to the frontend — a collapsed widget on the Dashboard and a full `/briefing` page — both consuming `GET /api/briefing/daily`.

**Architecture:** API client + types in `api/briefing.ts`; `useBriefing` hook fetches once on mount; `BriefingWidget` sits above `PortfolioSummaryCard` on the Dashboard; `BriefingPage` composes four sub-components (Hero, Grid, News, Narrative). No shared state needed — both callers fetch independently since this is a read-only daily snapshot.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, framer-motion, lucide-react, axios (via `@/api/client`), React Router v6

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `frontend/src/api/briefing.ts` | TS types + `getDailyBriefing()` |
| Create | `frontend/src/features/briefing/useBriefing.ts` | Fetch hook |
| Create | `frontend/src/features/briefing/BriefingWidget.tsx` | Collapsed dashboard card |
| Create | `frontend/src/features/briefing/BriefingHero.tsx` | Full-width hero strip for briefing page |
| Create | `frontend/src/features/briefing/BriefingGrid.tsx` | 3-col card grid (gainers, losers, sectors) |
| Create | `frontend/src/features/briefing/BriefingNews.tsx` | News headlines list |
| Create | `frontend/src/features/briefing/BriefingNarrative.tsx` | AI narrative panel |
| Create | `frontend/src/pages/BriefingPage.tsx` | Page composition for `/briefing` |
| Modify | `frontend/src/api/briefing.ts` | (created fresh) |
| Modify | `frontend/src/App.tsx` | Add `/briefing` route |
| Modify | `frontend/src/layouts/app-layout.tsx` | Add Briefing nav item |
| Modify | `frontend/src/pages/DashboardPage.tsx` | Insert `BriefingWidget` |

---

### Task 1: API client and TypeScript types

**Files:**
- Create: `frontend/src/api/briefing.ts`

- [ ] **Step 1: Create the API client file**

```typescript
// frontend/src/api/briefing.ts
import client from './client'

export interface MarketIndexDto {
  symbol: string
  label: string
  dayChangePercent: number
}

export interface HoldingMoverDto {
  symbol: string
  dayChangePercent: number
  portfolioValue: number
}

export interface SectorBreakdownDto {
  sector: string
  portfolioPercent: number
}

export interface NewsHeadlineDto {
  symbol: string
  headline: string
}

export interface DailyBriefingResponse {
  date: string
  currency: string
  portfolioChangePercent: number | null
  portfolioChangeAbsolute: number | null
  portfolioTotal: number
  marketIndices: MarketIndexDto[]
  topGainers: HoldingMoverDto[]
  topLosers: HoldingMoverDto[]
  sectorBreakdown: SectorBreakdownDto[]
  newsHeadlines: NewsHeadlineDto[]
  briefingText: string
}

export async function getDailyBriefing(): Promise<DailyBriefingResponse> {
  const res = await client.get<DailyBriefingResponse>('/api/briefing/daily')
  return res.data
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `briefing.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/briefing.ts
git commit -m "feat: add briefing API client and TypeScript types"
```

---

### Task 2: `useBriefing` hook

**Files:**
- Create: `frontend/src/features/briefing/useBriefing.ts`

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/features/briefing/useBriefing.ts
import { useState, useEffect } from 'react'
import { getDailyBriefing, type DailyBriefingResponse } from '@/api/briefing'

interface BriefingState {
  data: DailyBriefingResponse | null
  loading: boolean
  error: string | null
}

export function useBriefing(): BriefingState {
  const [data, setData] = useState<DailyBriefingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getDailyBriefing()
      .then(d => {
        if (!cancelled) setData(d)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load daily briefing')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/briefing/useBriefing.ts
git commit -m "feat: add useBriefing hook"
```

---

### Task 3: `BriefingWidget` — collapsed Dashboard card

**Files:**
- Create: `frontend/src/features/briefing/BriefingWidget.tsx`

- [ ] **Step 1: Create the widget**

```tsx
// frontend/src/features/briefing/BriefingWidget.tsx
import { Link } from 'react-router-dom'
import { Newspaper } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import { useBriefing } from './useBriefing'

function IndexPill({ symbol, dayChangePercent }: { symbol: string; dayChangePercent: number }) {
  const positive = dayChangePercent >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        positive
          ? 'bg-success/15 text-success'
          : 'bg-destructive/15 text-destructive',
      )}
    >
      {symbol} {positive ? '▲' : '▼'}{Math.abs(dayChangePercent).toFixed(2)}%
    </span>
  )
}

export function BriefingWidget() {
  const { data, loading } = useBriefing()

  if (loading) {
    return <div className="h-16 animate-pulse rounded-xl bg-muted" />
  }

  if (!data) return null

  const changePercent = data.portfolioChangePercent
  const changeAbsolute = data.portfolioChangeAbsolute
  const positive = changePercent == null || changePercent >= 0
  const topGainer = data.topGainers[0] ?? null
  const topLoser = data.topLosers[0] ?? null

  return (
    <Card className="px-4 py-3 space-y-2">
      {/* Row 1: title + portfolio Δ + link */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Daily Briefing</span>
          {changePercent != null && (
            <span
              className={cn(
                'tabular-nums font-mono text-sm font-bold',
                positive ? 'text-success' : 'text-destructive',
              )}
            >
              {positive ? '▲' : '▼'} {positive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          )}
          {changeAbsolute != null && (
            <span className="text-xs text-muted-foreground tabular-nums font-mono">
              ({positive ? '+' : ''}{formatMoney(changeAbsolute, data.currency)})
            </span>
          )}
        </div>
        <Link
          to="/briefing"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          View full →
        </Link>
      </div>

      {/* Row 2: market index pills */}
      {data.marketIndices.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.marketIndices.map(idx => (
            <IndexPill key={idx.symbol} symbol={idx.symbol} dayChangePercent={idx.dayChangePercent} />
          ))}
        </div>
      )}

      {/* Row 3: top mover pair */}
      {(topGainer || topLoser) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {topGainer && (
            <span>
              ↑ <span className="font-semibold text-success">{topGainer.symbol} +{topGainer.dayChangePercent.toFixed(2)}%</span>
            </span>
          )}
          {topLoser && (
            <span>
              ↓ <span className="font-semibold text-destructive">{topLoser.symbol} {topLoser.dayChangePercent.toFixed(2)}%</span>
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/briefing/BriefingWidget.tsx
git commit -m "feat: add BriefingWidget collapsed dashboard card"
```

---

### Task 4: Insert `BriefingWidget` into Dashboard

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add import and insert widget above PortfolioSummaryCard**

In `frontend/src/pages/DashboardPage.tsx`, add the import at the top with the other feature imports:

```typescript
import { BriefingWidget } from '@/features/briefing/BriefingWidget'
```

Then insert the widget as the first `motion.div` child inside the stagger container, before the existing summary card block:

```tsx
{/* Daily briefing widget */}
<motion.div variants={staggerItem}>
  <BriefingWidget />
</motion.div>

{/* Summary card */}
<motion.div variants={staggerItem}>
  {summary ? (
    <PortfolioSummaryCard summary={summary} />
  ) : (
    <div className="h-40 animate-pulse rounded-2xl bg-muted" />
  )}
</motion.div>
```

The full updated stagger container (inside `<div className="p-6 space-y-5">`) should begin:

```tsx
<motion.div
  variants={stagger}
  initial="hidden"
  animate="visible"
  className="space-y-5"
>
  {/* Daily briefing widget */}
  <motion.div variants={staggerItem}>
    <BriefingWidget />
  </motion.div>

  {/* Summary card */}
  <motion.div variants={staggerItem}>
    {summary ? (
      <PortfolioSummaryCard summary={summary} />
    ) : (
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    )}
  </motion.div>
  {/* ... rest unchanged ... */}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: insert BriefingWidget into Dashboard"
```

---

### Task 5: Briefing page sub-components

**Files:**
- Create: `frontend/src/features/briefing/BriefingHero.tsx`
- Create: `frontend/src/features/briefing/BriefingGrid.tsx`
- Create: `frontend/src/features/briefing/BriefingNews.tsx`
- Create: `frontend/src/features/briefing/BriefingNarrative.tsx`

- [ ] **Step 1: Create `BriefingHero`**

```tsx
// frontend/src/features/briefing/BriefingHero.tsx
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import type { DailyBriefingResponse, MarketIndexDto } from '@/api/briefing'

function IndexPill({ idx }: { idx: MarketIndexDto }) {
  const positive = idx.dayChangePercent >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums',
        positive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
      )}
    >
      {idx.label} {positive ? '▲' : '▼'}{Math.abs(idx.dayChangePercent).toFixed(2)}%
    </span>
  )
}

interface Props {
  data: DailyBriefingResponse
}

export function BriefingHero({ data }: Props) {
  const positive = data.portfolioChangePercent == null || data.portfolioChangePercent >= 0

  return (
    <div className="rounded-xl border border-border bg-card px-6 py-5 space-y-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Today's Portfolio Change
        </p>
        {data.portfolioChangePercent != null && (
          <span
            className={cn(
              'font-mono text-2xl font-bold tabular-nums',
              positive ? 'text-success' : 'text-destructive',
            )}
          >
            {positive ? '+' : ''}{data.portfolioChangePercent.toFixed(2)}%
          </span>
        )}
        {data.portfolioChangeAbsolute != null && (
          <span className={cn('font-mono text-sm tabular-nums', positive ? 'text-success' : 'text-destructive')}>
            ({positive ? '+' : ''}{formatMoney(data.portfolioChangeAbsolute, data.currency)})
          </span>
        )}
      </div>
      {data.marketIndices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.marketIndices.map(idx => (
            <IndexPill key={idx.symbol} idx={idx} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `BriefingGrid`**

```tsx
// frontend/src/features/briefing/BriefingGrid.tsx
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import type { DailyBriefingResponse } from '@/api/briefing'

interface Props {
  data: DailyBriefingResponse
}

function MoverRow({ symbol, dayChangePercent, portfolioValue, currency, positive }: {
  symbol: string
  dayChangePercent: number
  portfolioValue: number
  currency: string
  positive: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="font-semibold text-sm text-foreground">{symbol}</span>
      <div className="text-right">
        <p className={cn('font-mono text-sm font-semibold tabular-nums', positive ? 'text-success' : 'text-destructive')}>
          {positive ? '+' : ''}{dayChangePercent.toFixed(2)}%
        </p>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatMoney(portfolioValue, currency)}
        </p>
      </div>
    </div>
  )
}

export function BriefingGrid({ data }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Top Gainers */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Gainers</h3>
        {data.topGainers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data</p>
        ) : (
          data.topGainers.map(g => (
            <MoverRow
              key={g.symbol}
              symbol={g.symbol}
              dayChangePercent={g.dayChangePercent}
              portfolioValue={g.portfolioValue}
              currency={data.currency}
              positive
            />
          ))
        )}
      </div>

      {/* Top Losers */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Losers</h3>
        {data.topLosers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data</p>
        ) : (
          data.topLosers.map(l => (
            <MoverRow
              key={l.symbol}
              symbol={l.symbol}
              dayChangePercent={l.dayChangePercent}
              portfolioValue={l.portfolioValue}
              currency={data.currency}
              positive={false}
            />
          ))
        )}
      </div>

      {/* Sector Breakdown */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sector Breakdown</h3>
        {data.sectorBreakdown.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data</p>
        ) : (
          data.sectorBreakdown.map(s => (
            <div key={s.sector} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
              <span className="text-sm text-foreground">{s.sector}</span>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">{s.portfolioPercent.toFixed(1)}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `BriefingNews`**

```tsx
// frontend/src/features/briefing/BriefingNews.tsx
import type { DailyBriefingResponse } from '@/api/briefing'

interface Props {
  data: DailyBriefingResponse
}

export function BriefingNews({ data }: Props) {
  if (data.newsHeadlines.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">News Headlines</h3>
      <ul className="space-y-2">
        {data.newsHeadlines.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
              {item.symbol}
            </span>
            <span className="text-foreground leading-snug">{item.headline}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Create `BriefingNarrative`**

```tsx
// frontend/src/features/briefing/BriefingNarrative.tsx
import { Sparkles } from 'lucide-react'
import type { DailyBriefingResponse } from '@/api/briefing'

interface Props {
  data: DailyBriefingResponse
}

export function BriefingNarrative({ data }: Props) {
  if (!data.briefingText) return null

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-purple-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">AI Summary</h3>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
        {data.briefingText}
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/briefing/BriefingHero.tsx \
        frontend/src/features/briefing/BriefingGrid.tsx \
        frontend/src/features/briefing/BriefingNews.tsx \
        frontend/src/features/briefing/BriefingNarrative.tsx
git commit -m "feat: add briefing page sub-components (hero, grid, news, narrative)"
```

---

### Task 6: `BriefingPage`

**Files:**
- Create: `frontend/src/pages/BriefingPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/BriefingPage.tsx
git commit -m "feat: add BriefingPage"
```

---

### Task 7: Wire up route and nav

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/app-layout.tsx`

- [ ] **Step 1: Add route in `App.tsx`**

Add the import near the top with other page imports:

```typescript
import BriefingPage from './pages/BriefingPage'
```

Add the route inside the authenticated `<Route>` group, after the Dashboard route:

```tsx
<Route path="/" element={<DashboardPage />} />
<Route path="/briefing" element={<BriefingPage />} />
```

- [ ] **Step 2: Add nav item in `app-layout.tsx`**

Add `Newspaper` to the lucide-react import at the top of `app-layout.tsx`:

```typescript
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
```

In the `navGroups` array, add the Briefing item to the Portfolio group between Dashboard and Monthly Flow:

```typescript
{
  label: 'Portfolio',
  items: [
    { to: '/',             label: 'Dashboard',    icon: LayoutDashboard, end: true },
    { to: '/briefing',     label: 'Briefing',     icon: Newspaper },
    { to: '/monthly-flow', label: 'Monthly Flow', icon: TrendingUp },
    { to: '/allocations',  label: 'Allocations',  icon: PieChart },
    { to: '/transactions/new', label: 'Transactions', icon: ArrowLeftRight },
  ],
},
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/layouts/app-layout.tsx
git commit -m "feat: wire up /briefing route and nav item"
```

---

### Task 8: Manual verification

- [ ] **Step 1: Start the backend**

```bash
cd backend && ./gradlew bootRun
```

Expected: server running on port 8080

- [ ] **Step 2: Start the frontend**

```bash
cd frontend && npm run dev
```

Expected: Vite dev server running (typically port 5173)

- [ ] **Step 3: Verify the Dashboard widget**

Open `http://localhost:5173`. Confirm:
- "Briefing" nav item appears in the sidebar under Portfolio
- `BriefingWidget` card appears above the Portfolio Summary Card
- Widget shows portfolio Δ (green/red), index pills, and top gainer/loser
- Loading skeleton shows briefly before data loads
- "View full →" link is visible

- [ ] **Step 4: Verify the full briefing page**

Click "View full →" or the "Briefing" nav item. Confirm:
- Page header shows "Daily Briefing" and the date
- Hero strip shows portfolio Δ (large) and all index pills
- 3-column grid shows Top Gainers, Top Losers, Sector Breakdown
- News headlines list renders
- AI Summary (purple) panel renders at the bottom
- Green/red color coding is correct for positive/negative values

- [ ] **Step 5: Verify error state**

Stop the backend and reload the Dashboard. Confirm:
- Widget shows `null` (hidden) gracefully — does not crash the page
- Dashboard rest of the content still renders

- [ ] **Step 6: Commit verification notes (no code changes needed unless bugs found)**

If all looks good:
```bash
git log --oneline -8
```

Confirm all 7 feature commits are present in order.
