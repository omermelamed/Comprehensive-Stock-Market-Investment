# Phase 11 — Alerts UI

**Goal:** Build the frontend for the alerts system. The backend scheduler and `AlertController` already exist — this phase adds the in-app UI: notification badge, alerts management page, and the "Set Alert" action wired from the Watchlist.

**Prerequisite:** Phase 10 complete. `AlertController` and `AlertCheckScheduler` are live.

**Status:** ⬜ Not started

---

## Backend Tasks

### Minor additions only
- [ ] `GET /api/alerts/unread-count` — count of triggered alerts the user has not dismissed
- [ ] `POST /api/alerts/{id}/dismiss` — mark a triggered alert as seen (clears badge)

---

## Frontend Tasks

### Notification Badge
- [ ] `useAlertBadge` hook — polls `GET /api/alerts/unread-count` every 60 seconds
- [ ] Badge in nav/header showing unread count (red dot, disappears at 0)
- [ ] Clicking badge navigates to Alerts page

### Alerts Management Page
- [ ] `api/alerts.ts` — full CRUD + dismiss endpoints
- [ ] `useAlerts.ts` — fetch active alerts, triggered history, create, delete, re-enable, dismiss
- [ ] `AlertsPage.tsx` — two sections:
  - **Active alerts** — table: symbol, condition (above/below), threshold, note, source badge, created date, delete button
  - **Triggered alerts** — table: symbol, triggered at, threshold, dismiss button, re-enable button
- [ ] `CreateAlertForm.tsx` — symbol input, condition toggle (above / below), threshold price, optional note

### Watchlist Integration
- [ ] Wire "Set Alert" action in `WatchlistPage` — pre-fills symbol in `CreateAlertForm`

### Alert Delivery (if WhatsApp enabled)
- [ ] Alert scheduler already sends WhatsApp if enabled — no new backend work
- [ ] Show WhatsApp delivery status in triggered alert row (sent / not configured)

---

## Validation Checklist

- [ ] Badge shows correct unread count and disappears after all dismissed
- [ ] Creating an alert appears immediately in active list
- [ ] Triggered alerts move from active → triggered section
- [ ] Re-enabling a triggered alert moves it back to active
- [ ] "Set Alert" from Watchlist pre-fills the symbol correctly
- [ ] Alerts page accessible from nav badge and from nav menu
