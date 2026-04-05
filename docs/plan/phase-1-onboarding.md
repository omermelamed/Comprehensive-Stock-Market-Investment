# Phase 1 — Onboarding Flow + Transaction Entry

**Goal:** User can configure their profile, define target allocation, and log transactions.
Nothing else in the app works until this phase is complete — all other features depend on data entered here.

**Status:** ✅ Complete

---

## Database

- [x] `user_profile` table — in V1 migration
- [x] `target_allocations` table — in V1 migration
- [x] `transactions` table — in V1 migration

No new migrations needed for this phase.

---

## Backend Tasks

### User Profile
- [x] `GET /api/profile` — return current profile (or null if onboarding not complete)
- [x] `POST /api/profile` — create profile (onboarding step 1 + 2)
- [x] `PUT /api/profile` — update profile (Settings page)
- [x] `POST /api/profile/complete-onboarding` — set `onboarding_completed = true`
- [x] `UserProfileRepository` — jOOQ queries for user_profile table
- [x] `UserProfileService` — orchestration + risk level computation from questionnaire answers
- [x] `RiskLevelCalculator` — pure function: questionnaire answers → CONSERVATIVE / MODERATE / AGGRESSIVE

### Target Allocations
- [x] `GET /api/allocations` — return all target allocations ordered by `display_order`
- [x] `POST /api/allocations` — create allocation entry
- [x] `PUT /api/allocations/{id}` — update label, percentage, or order
- [x] `DELETE /api/allocations/{id}` — remove allocation entry
- [x] `PUT /api/allocations` — bulk replace (used on onboarding step 3 confirm)
- [x] `AllocationRepository` — jOOQ queries
- [x] `AllocationValidator` — enforce: sum = 100%, no duplicates, each > 0%, min 1 entry

### Transactions
- [x] `GET /api/transactions` — paginated transaction history
- [x] `POST /api/transactions` — log a new transaction
- [x] `DELETE /api/transactions/{id}` — remove a transaction (with holdings re-derivation check)
- [x] `TransactionRepository` — jOOQ queries
- [x] `TransactionValidator` — enforce: SELL ≤ current long holding, COVER ≤ current short exposure
- [x] `HoldingsProjectionRepository` — derive current holdings from transactions (used by validator and dashboard)

### Holdings Derivation
- [x] `GET /api/holdings` — return derived holdings per symbol (uses `current_holdings` view)
- [x] `HoldingResponse` DTO — symbol, track, net_quantity, avg_buy_price, total_cost_basis

### Onboarding Gate
- [x] Frontend redirect guard in `App.tsx` — redirects to `/onboarding` if `onboarding_completed = false`
  - Note: backend `OnboardingInterceptor` was not added; frontend guard is sufficient for local single-user app

---

## Frontend Tasks

### Routing
- [x] App router — if no profile or `onboarding_completed = false` → redirect to `/onboarding`
- [x] Route: `/onboarding` — multi-step flow
- [x] Route: `/transactions/new` — transaction entry form

### Onboarding Flow (5 steps)
- [x] `OnboardingPage` — step controller, progress indicator
- [x] `Step1BasicInfo` — implemented as `components/onboarding/profile-setup.tsx`
- [x] `Step2Questionnaire` — 7 questions, risk level computed and shown to user
- [x] `Step3TargetAllocation` — symbol search + add rows, live % tracker, must reach 100%
  - [x] `AllocationRow` — inlined in Step3: symbol input, label input, percentage input, remove button
  - [x] `AllocationTotalBar` — inlined in Step3 using `Progress` component; turns green at 100%
- [x] `Step4InitialHoldings` — manual entry, CSV import, or skip
- [x] `Step5Confirmation` — implemented as `components/onboarding/step-review.tsx`
- [x] `useOnboarding` hook — step state, form data, submission

### Transaction Entry
- [x] `TransactionFormPage` — full transaction entry form
- [x] `SymbolAutocomplete` — search from user's target allocations first, then free input
- [x] `useTransactionForm` hook — form state, validation, submission
- [x] `TransactionList` — paginated history table with delete

### API Client
- [x] `api/profile.ts` — profile CRUD
- [x] `api/allocations.ts` — allocations CRUD
- [x] `api/transactions.ts` — transactions CRUD
- [x] `api/holdings.ts` — derived holdings

---

## Validation Checklist

- [x] Cannot proceed past Step 3 unless allocation total = exactly 100%
- [x] Cannot save duplicate symbols in target allocations
- [x] SELL transaction is blocked if quantity > current holdings
- [x] COVER transaction is blocked if quantity > current short exposure
- [x] App redirects to onboarding on first load
- [x] App goes to dashboard after onboarding completed
- [ ] Profile is editable from Settings without re-running full onboarding — Settings page not yet built (Phase 2+)
