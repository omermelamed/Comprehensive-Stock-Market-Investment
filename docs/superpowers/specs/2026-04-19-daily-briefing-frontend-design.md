# Daily Briefing Frontend — Design Spec

**Date:** 2026-04-19  
**Status:** Approved

---

## Problem

The `GET /api/briefing/daily` endpoint is implemented and returns a rich daily snapshot (portfolio change, market indices, top movers, sector breakdown, news headlines, AI narrative), but there is no frontend surface for it. Users can only access it via raw HTTP.

---

## Solution

Two surfaces:

1. **Collapsed widget** on the Dashboard — quick daily pulse above the Portfolio Summary Card
2. **Full page** at `/briefing` — all briefing sections in detail

---

## API Contract

`GET /api/briefing/daily` returns:

```ts
interface DailyBriefingResponse {
  date: string                    // LocalDate as ISO string
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

interface MarketIndexDto   { symbol: string; label: string; dayChangePercent: number }
interface HoldingMoverDto  { symbol: string; dayChangePercent: number; portfolioValue: number }
interface SectorBreakdownDto { sector: string; portfolioPercent: number }
interface NewsHeadlineDto  { symbol: string; headline: string }
```

---

## New Files

| File | Purpose |
|------|---------|
| `frontend/src/api/briefing.ts` | Typed API client; exports `getDailyBriefing()` and all TS types |
| `frontend/src/features/briefing/useBriefing.ts` | Fetches once on mount; returns `{ data, loading, error }` |
| `frontend/src/features/briefing/BriefingWidget.tsx` | Collapsed dashboard card |
| `frontend/src/features/briefing/BriefingHero.tsx` | Full-width hero strip for the briefing page |
| `frontend/src/features/briefing/BriefingGrid.tsx` | 3-col grid: Top Gainers, Top Losers, Sector Breakdown |
| `frontend/src/features/briefing/BriefingNews.tsx` | News headlines list |
| `frontend/src/features/briefing/BriefingNarrative.tsx` | AI narrative panel |
| `frontend/src/pages/BriefingPage.tsx` | Page composition for `/briefing` |

---

## Modified Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Add `<Route path="/briefing" element={<BriefingPage />} />` |
| `frontend/src/layouts/app-layout.tsx` | Add "Briefing" nav item under Portfolio group (between Dashboard and Monthly Flow) |
| `frontend/src/pages/DashboardPage.tsx` | Insert `<BriefingWidget />` above `<PortfolioSummaryCard />` |

---

## Component Breakdown

### `BriefingWidget` (Dashboard collapsed card)

Sits above `PortfolioSummaryCard` in the Dashboard stagger animation. Contains three rows:

1. Title + portfolio Δ (% and absolute) + "View full →" link (navigates to `/briefing`)
2. Market index pills — one per `marketIndices` entry; green/red based on sign of `dayChangePercent`
3. Top mover row — best gainer and worst loser from holdings

**Loading state:** single-row skeleton pulse matching card height.  
**Error state:** subtle inline message, does not block the rest of the dashboard.  
**Empty state:** hide widget if no data is available (e.g. weekend with no snapshot).

### `BriefingPage` (`/briefing`)

Composed of:

1. **Page header** — "Daily Briefing" title + date
2. **`BriefingHero`** — full-width strip: portfolio Δ (large) + all index pills
3. **`BriefingGrid`** — 3-column card grid:
   - Top Gainers: list of `topGainers` (symbol, day Δ%, portfolio value)
   - Top Losers: list of `topLosers` (symbol, day Δ%, portfolio value)
   - Sector Breakdown: list of `sectorBreakdown` (sector, portfolio %)
4. **`BriefingNews`** — news headlines list (symbol + headline per row)
5. **`BriefingNarrative`** — AI narrative card, visually subordinate (purple-tinted, labeled "AI Summary")

**Loading state:** skeleton for hero + grid placeholders.  
**Error state:** page-level error message.

---

## Data Flow

`useBriefing` is called independently in both `BriefingWidget` and `BriefingPage`. No shared state is needed — the briefing is a daily read-only snapshot and both callers fetch it on mount. This keeps the hook simple and avoids global state for a non-critical feature.

---

## Visual Design

- **Green** for positive Δ and positive index changes
- **Red** for negative Δ and negative index changes
- **Purple** for AI narrative surface (labeled "AI Summary", visually secondary)
- Index pills: small rounded badges with color background at 15% opacity
- Mover entries: symbol bold, Δ% colored, portfolio value muted
- Sector breakdown: sector name + percentage, no chart needed (text list is sufficient)
- News headlines: compact list, symbol as prefix badge

---

## Navigation

- Nav item: **Briefing** added to the Portfolio group in the sidebar, between Dashboard and Monthly Flow
- Icon: `Newspaper` from lucide-react
- Route: `/briefing`

---

## Testing Scope

No automated tests required for this feature — it is a pure read display layer with no business logic. Manual verification covers:
- Widget renders with real API data
- "View full →" navigates correctly
- Full page renders all sections
- Loading and error states display correctly for both surfaces
- Color coding is correct for positive/negative values
