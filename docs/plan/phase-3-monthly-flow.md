# Phase 3 — Monthly Investment Flow (Math Only)

**Goal:** User can enter a monthly budget, see suggested allocations based on their own target gaps, adjust amounts, and confirm — which logs BUY transactions automatically.
No AI in this phase. Pure deterministic math only.

**Prerequisite:** Phase 2 complete. Market data integration working.

**Status:** ✅ Complete

---

## Key Formulas (from PRD §5.3)

```
Total Portfolio Value     = Σ (quantity × current_price) for all holdings
Target Value              = Total Portfolio Value × target_percentage
Current Value             = quantity_held × current_price
Gap                       = Target Value - Current Value

If Gap > 0  → UNDERWEIGHT → eligible for suggestion
If Gap ≤ 0  → OVERWEIGHT  → suggested amount = 0 (never suggest selling)

Total Positive Gap        = Σ all gaps where Gap > 0
Position Weight           = Position Gap / Total Positive Gap
Suggested Amount          = Monthly Budget × Position Weight
```

---

## Backend Tasks

### Preview Endpoint
- [x] `POST /api/monthly-flow/preview` — request: `{ amount, currency }`
  - response: list of position cards (see DTO below)
- [x] `MonthlyFlowPreviewRequest` — `amount: BigDecimal, currency: String`
- [x] `MonthlyFlowPreviewResponse` — `monthlyBudget, currency, positions: List<PositionCardDto>`
- [x] `PositionCardDto`:
  - `symbol, label, assetType`
  - `targetPercent, currentPercent, gapPercent, gapValue`
  - `status: UNDERWEIGHT | OVERWEIGHT | ON_TARGET`
  - `suggestedAmount`
  - `metrics` — not included in phase 3 implementation (P/E, PEG, D/E, FCF deferred)
  - `aiSummary: null` (filled in Phase 4)
- [x] `MonthlyAllocationCalculator` — pure function: holdings + prices + targets + budget → position cards
  - gap model computation
  - suggested distribution across underweight positions
  - overweight positions get suggestedAmount = 0
- [x] `MonthlyFlowPreviewService` — load data, call calculator, fetch metrics, build response

### Confirm Endpoint
- [x] `POST /api/monthly-flow/confirm` — request: list of `{ symbol, amount, pricePerUnit }`
  - validates total ≤ monthly budget
  - converts each confirmed amount to quantity = amount / pricePerUnit
  - logs each as a BUY transaction in `transactions`
  - saves session record to `monthly_investment_sessions`
  - response: list of created transaction IDs
- [x] `MonthlyFlowConfirmRequest` — `{ positions: List<{ symbol, amount, pricePerUnit }> }`
- [x] `MonthlyFlowConfirmService` — validate totals, create transactions, save session
- [x] `MonthlyFlowValidator` — total confirmed amount must not exceed original budget

---

## Frontend Tasks

### Monthly Flow Entry Point
- [x] "Invest This Month" button on Dashboard → opens flow
- [x] `MonthlyFlowPage` or modal — full-screen flow

### Budget Input Screen
- [x] `MonthlyBudgetInput` — currency-aware amount input
- [x] `useMonthlyFlowPreview` hook — POST to preview, manage loading state

### Position Cards
- [x] `PositionCardList` — stagger animation as cards load (Framer Motion)
- [x] `UnderweightPositionCard` — shows gap, target %, current %, editable suggested amount
  - metrics (P/E, PEG, D/E, FCF) not included in phase 3
  - AI summary placeholder (Phase 4)
- [x] `OverweightPositionCard` — simplified "no action needed" card
- [ ] `MetricBadge` — colored signal indicator (🟢/🟡/🔴) per metric value (deferred — no metrics in phase 3)
- [x] `AmountInput` — currency input that updates running total on change

### Running Total Footer
- [x] `AllocationSummaryFooter` — sticky footer with:
  - Monthly Budget: [amount]
  - Allocated: [sum of all inputs]
  - Remaining: [difference] — turns red if over budget
- [x] Real-time update as user edits any amount input

### Confirmation Dialog
- [x] `ConfirmInvestmentDialog` — shows summary table before logging
  - symbol → amount → estimated shares
  - total
  - Cancel / Confirm & Log buttons
- [x] `useMonthlyFlowConfirm` hook — POST to confirm, handle response

### API Client
- [x] `api/monthlyFlow.ts` — preview and confirm endpoints

---

## Validation Checklist

- [x] All overweight positions have suggestedAmount = 0
- [x] Suggested amounts across underweight positions sum to the monthly budget (within rounding)
- [x] If all positions are overweight, all suggested amounts are 0 and user is informed
- [x] User can freely edit any suggested amount
- [x] Footer turns red immediately when total exceeds budget
- [x] Confirmation is blocked if total > budget
- [x] Backend revalidates total before logging transactions (frontend total is for UX only)
- [x] Confirmed allocations appear in transaction history
- [x] Session saved to `monthly_investment_sessions`
- [x] Holdings update correctly after confirmation
