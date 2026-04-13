# Phase 16 — Onboarding Gaps

**Goal:** Complete the remaining onboarding steps from PRD v1.4 that were not built in Phase 1: WhatsApp setup, timezone selection, and tracks of interest multi-select.

**Prerequisite:** Phase 1 complete. Phase 12 complete (WhatsApp infrastructure needed for Step 5).

**Status:** ⬜ Not started

---

## Context

Phase 1 built the core onboarding flow. Three steps from PRD §5.1 were deferred:
- **Step 1** is missing timezone selection
- **Step 2** is missing tracks of interest multi-select
- **Step 5** (WhatsApp setup) was not built

---

## Backend Tasks

### Schema / API
- [ ] Verify `user_profile.timezone` column exists (added in V4 or add new migration)
- [ ] Verify `user_profile.tracks_enabled` JSONB column exists (add if missing)
- [ ] `PUT /api/profile` already handles profile updates — confirm it accepts `timezone` and `tracks_enabled`

---

## Frontend Tasks

### Step 1 — Basic Info (add timezone)
- [ ] Add timezone dropdown to existing Step 1 of `OnboardingPage`
- [ ] Dropdown: IANA timezone list, pre-selected from browser `Intl.DateTimeFormat().resolvedOptions().timeZone`
- [ ] Save `timezone` to `user_profile`

### Step 2 — Investment Profile (add tracks)
- [ ] Add "Tracks of interest" multi-select to existing Step 2:
  - options: Long / Short / Crypto / Options
  - at least one required
- [ ] Save as `tracks_enabled` array in `user_profile`

### Step 5 — WhatsApp Setup (new step)
- [ ] Insert Step 5 into onboarding flow between Step 4 (Initial Holdings) and Step 6 (Confirmation)
- [ ] `WhatsAppOnboardingStep.tsx`:
  - phone number input (E.164 format, e.g. +972501234567)
  - enable/disable toggle
  - "Skip for now" link — saves `whatsapp_enabled = false`, clears number
  - note: "You can change this anytime in Settings"
- [ ] On confirm: save `whatsapp_number` + `whatsapp_enabled` to `user_profile`

### Step 6 — Confirmation (update summary)
- [ ] Summary screen should display timezone, enabled tracks, and WhatsApp status

### Settings Page
- [ ] Expose timezone, tracks, and WhatsApp fields as editable in Settings so users can update post-onboarding

---

## Validation Checklist

- [ ] Timezone saved correctly and used by `NextSendAtCalculator` (Phase 13)
- [ ] `tracks_enabled` controls visibility of Options nav link and SHORT/CRYPTO recommendation sub-agents
- [ ] WhatsApp step skippable without breaking onboarding completion
- [ ] Phone number validated as E.164 format before saving
- [ ] Existing users (onboarding already completed) can update all three fields from Settings
- [ ] Onboarding summary screen reflects all entered values including new fields
