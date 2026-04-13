# Phase 13 — Scheduled WhatsApp Messages

**Goal:** Let the user configure recurring WhatsApp messages on any schedule they choose — weekly portfolio summaries, monthly performance reports, investment reminders, etc. Everything is user-defined; nothing is hardcoded.

**Prerequisite:** Phase 12 complete. Twilio outbound and Claude message generation are working.

**Status:** ⬜ Not started

---

## Backend Tasks

### Database Schema
- [ ] Migration: `whatsapp_scheduled_messages` table
  - `id`, `message_type` (ENUM), `label` (VARCHAR), `frequency` (WEEKLY/BIWEEKLY/MONTHLY)
  - `day_of_week` (0–6, for WEEKLY + BIWEEKLY), `biweekly_week` (1 or 2), `day_of_month` (1–28, for MONTHLY)
  - `send_time` (TIME), `is_active` (BOOLEAN), `last_sent_at`, `next_send_at`, `send_count`, `created_at`
- [ ] Migration: `whatsapp_scheduled_message_log` table
  - `id`, `schedule_id` (FK), `sent_at`, `status` (SENT/FAILED), `error_message` (nullable), `twilio_sid`
- [ ] Migration: `upcoming_scheduled_messages` view — `WHERE is_active = true AND next_send_at <= NOW()`

### CRUD API
- [ ] `GET /api/whatsapp/schedules` — list all schedules with last sent + next send
- [ ] `POST /api/whatsapp/schedules` — create a new schedule
- [ ] `PUT /api/whatsapp/schedules/{id}` — edit schedule
- [ ] `PATCH /api/whatsapp/schedules/{id}/toggle` — enable / disable
- [ ] `DELETE /api/whatsapp/schedules/{id}` — delete
- [ ] `GET /api/whatsapp/schedules/{id}/history` — send history for a schedule

### Scheduler
- [ ] `WhatsAppScheduledMessageJob` — Spring `@Scheduled(fixedRate = 60_000)`:
  - reads `upcoming_scheduled_messages` view
  - for each due schedule: generate content → send via Twilio → update `last_sent_at` + `next_send_at` + `send_count` → log result
- [ ] `NextSendAtCalculator` — pure function: `(frequency, dayOfWeek, biweeklyWeek, dayOfMonth, sendTime, userTimezone, lastSentAt)` → next `Instant`
  - WEEKLY: next occurrence of `day_of_week` at `send_time`
  - BIWEEKLY: same day, alternating `biweekly_week` (1 = odd ISO weeks, 2 = even)
  - MONTHLY: next `day_of_month` at `send_time`

### Message Content Generators
Each generator calls Claude with full portfolio context (via `WhatsAppContextBuilder`) and returns plain-text WhatsApp message:
- [ ] `PORTFOLIO_SUMMARY` — total value, P&L, daily change, top holdings, allocation health
- [ ] `PERFORMANCE_REPORT` — P&L breakdown, SPY benchmark comparison, win rate, best/worst performer
- [ ] `ALLOCATION_CHECK` — current vs target per position, drift warnings, suggested rebalance actions
- [ ] `INVESTMENT_REMINDER` — "You haven't invested this month yet. Here's your suggested allocation for [range]."
- [ ] `TOP_MOVERS` — biggest gainers and losers in portfolio over the past 7 days

### WhatsApp Bot Integration
- [ ] `SCHEDULE_MESSAGE` write intent from Phase 12 creates a schedule via this phase's CRUD
- [ ] Confirmation message shows: type, label, frequency, day, time, timezone

---

## Frontend Tasks

### Settings Page — Scheduled Messages Section
- [ ] `api/whatsappSchedules.ts` — CRUD + history endpoints
- [ ] `useWhatsAppSchedules.ts` — fetch list, create, toggle, edit, delete
- [ ] `ScheduledMessagesList.tsx` — table: label, type badge, frequency, next send, last sent, active toggle, edit button, delete button
- [ ] `ScheduleForm.tsx` — create/edit form:
  - message type selector
  - custom label input
  - frequency selector (Weekly / Biweekly / Monthly)
  - day of week selector (shown for Weekly + Biweekly)
  - week cycle selector (shown for Biweekly: Week 1 / Week 2)
  - day of month selector (shown for Monthly: 1–28)
  - time picker
- [ ] `ScheduleSendHistory.tsx` — expandable row or modal: sent at, status, error if failed
- [ ] Empty state: "No schedules yet — add your first scheduled message"

---

## Validation Checklist

- [ ] `NextSendAtCalculator` unit tested for WEEKLY, BIWEEKLY (odd/even weeks), and MONTHLY cases
- [ ] `NextSendAtCalculator` correctly applies user's timezone from `user_profile.timezone`
- [ ] Scheduler fires within 1 minute of `next_send_at`
- [ ] `next_send_at` updated correctly after each send (no double-firing)
- [ ] Disabled schedules are skipped by the scheduler
- [ ] Send log records SENT or FAILED status correctly
- [ ] Creating a schedule via WhatsApp bot (Phase 12) creates the same record as the Settings UI
- [ ] Multiple concurrent active schedules all fire independently
- [ ] INVESTMENT_REMINDER checks if any BUY transactions exist in current month before sending
