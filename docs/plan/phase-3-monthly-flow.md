# Phase 3 — Monthly Investment Flow (Math Only)

**Goal:** User can enter a monthly budget, see suggested allocations based on their own target gaps, adjust amounts, and confirm — which logs BUY transactions automatically.
No AI in this phase. Pure deterministic math only.

**Prerequisite:** Phase 2 complete. Market data integration working.

**Status:** ⬜ Not started

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
- [ ] `POST /api/monthly-flow/preview` — request: `{ amount, currency }`
  - response: list of position cards (see DTO below)
- [ ] `MonthlyFlowPreviewRequest` — `amount: BigDecimal, currency: String`
- [ ] `MonthlyFlowPreviewResponse` — `monthlyBudget, currency, positions: List<PositionCardDto>`
- [ ] `PositionCardDto`:
  - `symbol, label, assetType`
  - `targetPercent, currentPercent, gapPercent, gapValue`
  - `status: UNDERWEIGHT | OVERWEIGHT | ON_TARGET`
  - `suggestedAmount`
  - `metrics: { pe, peg, de, fcf, peSignal, pegSignal, deSignal, fcfSignal }`
  - `aiSummary: null` (filled in Phase 4)
- [ ] `MonthlyAllocationCalculator` — pure function: holdings + prices + targets + budget → position cards
  - gap model computation
  - suggested distribution across underweight positions
  - overweight positions get suggestedAmount = 0
- [ ] `MonthlyFlowPreviewService` — load data, call calculator, fetch metrics, build response

### Confirm Endpoint
- [ ] `POST /api/monthly-flow/confirm` — request: list of `{ symbol, amount, pricePerUnit }`
  - validates total ≤ monthly budget
  - converts each confirmed amount to quantity = amount / pricePerUnit
  - logs each as a BUY transaction in `transactions`
  - saves session record to `monthly_investment_sessions`
  - response: list of created transaction IDs
- [ ] `MonthlyFlowConfirmRequest` — `{ positions: List<{ symbol, amount, pricePerUnit }> }`
- [ ] `MonthlyFlowConfirmService` — validate totals, create transactions, save session
- [ ] `MonthlyFlowValidator` — total confirmed amount must not exceed original budget

---

## Frontend Tasks

### Monthly Flow Entry Point
- [ ] "Invest This Month" button on Dashboard → opens flow
- [ ] `MonthlyFlowPage` or modal — full-screen flow

### Budget Input Screen
- [ ] `MonthlyBudgetInput` — currency-aware amount input
- [ ] `useMonthlyFlowPreview` hook — POST to preview, manage loading state

### Position Cards
- [ ] `PositionCardList` — stagger animation as cards load (Framer Motion)
- [ ] `UnderweightPositionCard` — shows all fields from PRD §5.3 card design
  - target %, current %, gap
  - metrics (P/E, PEG, D/E, FCF) with signal colors
  - AI summary placeholder (Phase 4)
  - editable suggested amount input
- [ ] `OverweightPositionCard` — simplified "no action needed" card
- [ ] `MetricBadge` — colored signal indicator (🟢/🟡/🔴) per metric value
- [ ] `AmountInput` — currency input that updates running total on change

### Running Total Footer
- [ ] `AllocationSummaryFooter` — sticky footer with:
  - Monthly Budget: [amount]
  - Allocated: [sum of all inputs]
  - Remaining: [difference] — turns red if over budget
- [ ] Real-time update as user edits any amount input

### Confirmation Dialog
- [ ] `ConfirmInvestmentDialog` — shows summary table before logging
  - symbol → amount → estimated shares
  - total
  - Cancel / Confirm & Log buttons
- [ ] `useMonthlyFlowConfirm` hook — POST to confirm, handle response

### API Client
- [ ] `api/monthlyFlow.ts` — preview and confirm endpoints

---

## Validation Checklist

- [ ] All overweight positions have suggestedAmount = 0
- [ ] Suggested amounts across underweight positions sum to the monthly budget (within rounding)
- [ ] If all positions are overweight, all suggested amounts are 0 and user is informed
- [ ] User can freely edit any suggested amount
- [ ] Footer turns red immediately when total exceeds budget
- [ ] Confirmation is blocked if total > budget
- [ ] Backend revalidates total before logging transactions (frontend total is for UX only)
- [ ] Confirmed allocations appear in transaction history
- [ ] Session saved to `monthly_investment_sessions`
- [ ] Holdings update correctly after confirmation
