# Daily Portfolio Briefing — Design Spec

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Add a daily portfolio briefing that surfaces today's performance in a clear, structured format. Delivered via two channels:

1. `GET /api/briefing/daily` — REST endpoint for the frontend
2. `DAILY_BRIEFING` — new Telegram scheduled message type

No Claude API required. All content is deterministic. Degrades gracefully when data sources are unavailable.

---

## Architecture

### New components

| Component | Layer | Purpose |
|---|---|---|
| `V{N}__add_sector_to_allocations.sql` | DB | `sector TEXT` nullable column on `target_allocations` |
| `YahooFinanceAdapter` (extended) | Infra | Add `fetchSectorInfo(symbol)` and `fetchNewsHeadlines(symbol)` — Yahoo-specific, not on `MarketDataProvider` interface |
| `PriceQuote` (extended) | Domain | Add optional `dayChangePercent: BigDecimal?` field |
| `DailyBriefingDataCollector` | Application | Gathers all inputs: snapshot diff, per-holding day change, sector info, news, indices. Injects `MarketDataService` for standard quotes and `YahooFinanceAdapter` directly for sector + news calls. |
| `DailyBriefingFormatter` | Domain | Pure testable formatter → produces final Markdown string |
| `DailyBriefingController` | API | `GET /api/briefing/daily` |
| `AllocationController / Service / Repository` | Existing | Extended to read/write the new `sector` field |
| `TelegramScheduledMessageContentGenerator` | Existing | Add `DAILY_BRIEFING` case |

### Not added
- No new scheduler
- No new DB tables beyond the one column
- No Claude API dependency

---

## Schema

```sql
ALTER TABLE target_allocations ADD COLUMN sector TEXT;
```

Nullable, no constraints. It is a display hint, not a business rule.

---

## Data Sources

### Today's portfolio change
Read from `portfolio_snapshots`: today's `daily_pnl` row.  
Percent = `daily_pnl / (totalValue - daily_pnl) × 100`.  
If no snapshot exists for today → both fields are `null`; briefing renders without the change line.

### Per-holding day change
Parse `meta.regularMarketChangePercent` from the existing Yahoo Finance `/v8/finance/chart/{symbol}` response. Add `dayChangePercent: BigDecimal?` to `PriceQuote`.

### Market indices
Fetch via existing `fetchQuote()` on three fixed symbols:
- `^GSPC` → S&P 500
- `^IXIC` → NASDAQ
- `^RUT` → Russell 2000

Uses the same `dayChangePercent` field. If a fetch fails, that index is omitted silently.

### Sector resolution (per holding, in order)
1. Manual override: `target_allocations.sector` if not blank
2. Auto-detect: `fetchSectorInfo(symbol)` → Yahoo `quoteSummary?modules=assetProfile` → `sector` field
3. Fallback: `"Other"`

Coverage expectations:
- Individual US stocks: ~90% reliable
- ETFs: ~50%, often returns "Financial Services" or blank
- Israeli TASE stocks: sparse

### News headlines
`fetchNewsHeadlines(symbol)`: calls  
`https://query1.finance.yahoo.com/v1/finance/search?q={symbol}&newsCount=3`  
Returns up to 2 headline strings. No API key required. If empty, the news section is omitted from `briefingText`.

### Timeouts
All Yahoo calls cap at 3 seconds. A slow or failing call does not stall the briefing.

---

## API Contract

### `GET /api/briefing/daily`

```json
{
  "date": "2026-04-18",
  "portfolioChangePercent": 1.23,
  "portfolioChangeAbsolute": 847.50,
  "currency": "USD",
  "marketIndices": [
    { "symbol": "^GSPC", "label": "S&P 500", "dayChangePercent": 0.87 },
    { "symbol": "^IXIC", "label": "NASDAQ",  "dayChangePercent": 1.12 },
    { "symbol": "^RUT",  "label": "Russell 2000", "dayChangePercent": 0.54 }
  ],
  "topGainers": [
    { "symbol": "NVDA", "dayChangePercent": 4.2, "portfolioValue": 12400.00 }
  ],
  "topLosers": [
    { "symbol": "BNDX", "dayChangePercent": -0.3, "portfolioValue": 3200.00 }
  ],
  "sectorBreakdown": [
    { "sector": "Technology", "portfolioPercent": 42.1 },
    { "sector": "Bonds",      "portfolioPercent": 18.3 }
  ],
  "newsHeadlines": [
    { "symbol": "NVDA", "headline": "Nvidia hits record on AI demand surge" }
  ],
  "briefingText": "..."
}
```

`briefingText` is the complete Markdown string used for Telegram. The frontend may render it directly or use the structured fields to build its own layout.

`portfolioChangePercent` and `portfolioChangeAbsolute` are nullable (omitted when no today snapshot exists).

---

## Telegram Integration

New message type: `DAILY_BRIEFING`

Added to the existing `generate()` switch in `TelegramScheduledMessageContentGenerator`:
```
"DAILY_BRIEFING" -> generateDailyBriefing()
```

Calls `DailyBriefingDataCollector`, passes result to `DailyBriefingFormatter`, returns Markdown string. Follows the same fallback pattern as existing types.

---

## Allocation UI Extension

The `sector` field is exposed on `TargetAllocationResponse` and accepted on `TargetAllocationRequest`. The frontend allocation management UI adds an optional sector input per row. When blank, the backend uses Yahoo auto-detect at briefing generation time (not stored).

---

## Formatter Output Shape (Markdown)

```
*Daily Portfolio Briefing — Apr 18 2026*

Portfolio: +$847.50 (+1.23%) today

*Market*
  S&P 500  +0.87%  |  NASDAQ  +1.12%  |  Russell 2000  +0.54%

*Top Movers*
  Gainers: NVDA +4.2%  AAPL +1.8%  MSFT +1.1%
  Losers:  BNDX -0.3%  AGG -0.1%

*Sector Breakdown*
  Technology  42.1%  |  Bonds  18.3%  |  International  15.6%  |  Other  24.0%

*Headlines*
  NVDA: Nvidia hits record on AI demand surge
  AAPL: Apple expands manufacturing in India
```

Sections are omitted when data is unavailable.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| No today snapshot | `portfolioChange*` fields null; change line omitted from briefing |
| Index fetch fails | That index omitted from `marketIndices` |
| Sector fetch blank | Falls back to `"Other"` silently |
| News returns nothing | `newsHeadlines` empty; headlines section omitted |
| All Yahoo calls timeout at 3s | Partial data returned; briefing renders with what's available |

---

## Testing

### `DailyBriefingFormatterTest` (unit)
- Full data → correct Markdown structure
- Null portfolio change → change line omitted
- Empty news → headlines section omitted
- All gainers/losers zero → movers section omitted

### `YahooFinanceAdapterTest` (unit)
- `dayChangePercent` parsed correctly from stubbed response
- `fetchSectorInfo` parses sector from stubbed `assetProfile` response
- `fetchNewsHeadlines` returns up to 2 titles from stubbed search response

No new integration tests — Yahoo calls follow the existing adapter pattern already tested.
