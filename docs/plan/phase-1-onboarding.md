# Phase 1 — Onboarding Flow + Transaction Entry

**Goal:** User can configure their profile, define target allocation, and log transactions.
Nothing else in the app works until this phase is complete — all other features depend on data entered here.

**Status:** ⬜ Not started

---

## Database

- [x] `user_profile` table — in V1 migration
- [x] `target_allocations` table — in V1 migration
- [x] `transactions` table — in V1 migration

No new migrations needed for this phase.

---

## Backend Tasks

### User Profile
- [ ] `GET /api/profile` — return current profile (or null if onboarding not complete)
- [ ] `POST /api/profile` — create profile (onboarding step 1 + 2)
- [ ] `PUT /api/profile` — update profile (Settings page)
- [ ] `POST /api/profile/complete-onboarding` — set `onboarding_completed = true`
- [ ] `UserProfileRepository` — jOOQ queries for user_profile table
- [ ] `UserProfileService` — orchestration + risk level computation from questionnaire answers
- [ ] `RiskLevelCalculator` — pure function: questionnaire answers → CONSERVATIVE / MODERATE / AGGRESSIVE

### Target Allocations
- [ ] `GET /api/allocations` — return all target allocations ordered by `display_order`
- [ ] `POST /api/allocations` — create allocation entry
- [ ] `PUT /api/allocations/{id}` — update label, percentage, or order
- [ ] `DELETE /api/allocations/{id}` — remove allocation entry
- [ ] `PUT /api/allocations` — bulk replace (used on onboarding step 3 confirm)
- [ ] `AllocationRepository` — jOOQ queries
- [ ] `AllocationValidator` — enforce: sum = 100%, no duplicates, each > 0%, min 1 entry

### Transactions
- [ ] `GET /api/transactions` — paginated transaction history
- [ ] `POST /api/transactions` — log a new transaction
- [ ] `DELETE /api/transactions/{id}` — remove a transaction (with holdings re-derivation check)
- [ ] `TransactionRepository` — jOOQ queries
- [ ] `TransactionValidator` — enforce: SELL ≤ current long holding, COVER ≤ current short exposure
- [ ] `HoldingsProjectionRepository` — derive current holdings from transactions (used by validator and dashboard)

### Holdings Derivation
- [ ] `GET /api/holdings` — return derived holdings per symbol (uses `current_holdings` view)
- [ ] `HoldingResponse` DTO — symbol, track, net_quantity, avg_buy_price, total_cost_basis

### Onboarding Gate
- [ ] `OnboardingInterceptor` or filter — redirect to `/onboarding` if `onboarding_completed = false`

---

## Frontend Tasks

### Routing
- [ ] App router — if no profile or `onboarding_completed = false` → redirect to `/onboarding`
- [ ] Route: `/onboarding` — multi-step flow
- [ ] Route: `/transactions/new` — transaction entry form

### Onboarding Flow (5 steps)
- [ ] `OnboardingPage` — step controller, progress indicator
- [ ] `Step1BasicInfo` — display name, preferred currency (ILS / USD / EUR / GBP)
- [ ] `Step2Questionnaire` — 7 questions, risk level computed and shown to user
- [ ] `Step3TargetAllocation` — symbol search + add rows, live % tracker, must reach 100%
  - [ ] `AllocationRow` — symbol input, label input, percentage input, remove button
  - [ ] `AllocationTotalBar` — live running total, turns green at 100%
- [ ] `Step4InitialHoldings` — manual entry, CSV import, or skip
- [ ] `Step5Confirmation` — summary of all entered data, confirm button
- [ ] `useOnboarding` hook — step state, form data, submission

### Transaction Entry
- [ ] `TransactionFormPage` — full transaction entry form
- [ ] `SymbolAutocomplete` — search from user's target allocations first, then free input
- [ ] `useTransactionForm` hook — form state, validation, submission
- [ ] `TransactionList` — paginated history table with delete

### API Client
- [ ] `api/profile.ts` — profile CRUD
- [ ] `api/allocations.ts` — allocations CRUD
- [ ] `api/transactions.ts` — transactions CRUD
- [ ] `api/holdings.ts` — derived holdings

---

## Validation Checklist

- [ ] Cannot proceed past Step 3 unless allocation total = exactly 100%
- [ ] Cannot save duplicate symbols in target allocations
- [ ] SELL transaction is blocked if quantity > current holdings
- [ ] COVER transaction is blocked if quantity > current short exposure
- [ ] App redirects to onboarding on first load
- [ ] App goes to dashboard after onboarding completed
- [ ] Profile is editable from Settings without re-running full onboarding
