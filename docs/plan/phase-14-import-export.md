# Phase 14 — Import & Export

**Goal:** Let the user import transaction history from a CSV or Excel file and export holdings, transactions, and P&L reports. Self-contained phase with no dependencies on WhatsApp phases.

**Prerequisite:** Phase 3 complete (transaction ledger working).

**Status:** ⬜ Not started

---

## Backend Tasks

### Import
- [ ] `POST /api/import/preview` — accepts multipart file (CSV or .xlsx), returns parsed rows with validation status per row (no DB writes)
- [ ] `POST /api/import/confirm` — accepts the validated payload and bulk-inserts transactions
- [ ] `ImportParser` — parse CSV and Excel into a list of raw row maps
- [ ] `ImportColumnMapper` — user-supplied column mapping (frontend sends `{ fileColumn: domainField }`) → normalized `TransactionImportRow`
- [ ] `ImportValidator` — validates each row:
  - required fields present
  - symbol non-empty
  - type is valid enum (BUY/SELL/SHORT/COVER)
  - quantity and price positive decimals
  - date parseable
  - SELL quantity does not exceed held at that point in time
- [ ] `ImportResult` — list of `{ rowIndex, status: OK|ERROR, errors: [...], parsedTransaction }`
- [ ] Bulk insert uses existing `TransactionRepository`; sets `source = IMPORT`

### Export
- [ ] `GET /api/export/holdings` — current holdings as CSV or Excel (query param `format=csv|xlsx`)
- [ ] `GET /api/export/transactions` — full transaction history as CSV or Excel
- [ ] `GET /api/export/performance` — P&L report as CSV or Excel (per position: cost basis, current value, unrealized P&L, realized P&L)
- [ ] `ExportFormatter` — shared utility: `List<Map<String, Any>>` + headers → CSV string or `.xlsx` bytes

---

## Frontend Tasks

### Import Flow
- [ ] `api/import.ts` — preview and confirm endpoints
- [ ] `useImport.ts` — file selection, column mapping state, preview result, confirm action
- [ ] `ImportPage.tsx` — multi-step flow:
  1. **Upload** — drag-and-drop or file picker (CSV / .xlsx)
  2. **Map columns** — user maps file columns to: Symbol, Type, Track, Quantity, Price, Date, Notes
  3. **Preview** — table of parsed rows; green rows (valid) + red rows (error with inline message); shows row count summary
  4. **Confirm** — "Import N transactions" button; on success shows summary and navigates to Transactions
- [ ] `ColumnMappingTable.tsx` — for each domain field, show a dropdown of detected file columns
- [ ] `ImportPreviewTable.tsx` — rows with status icons; expandable error detail per row
- [ ] Link to Import page from Transactions page header

### Export
- [ ] `api/export.ts` — download endpoints (returns blob)
- [ ] `ExportButton.tsx` — reusable button with format dropdown (CSV / Excel); triggers file download
- [ ] Add Export button to:
  - Dashboard → "Export Holdings"
  - Transactions page → "Export Transactions"
  - Analytics page → "Export P&L Report"

---

## Validation Checklist

- [ ] CSV and .xlsx files both parse correctly
- [ ] Column mapping UI handles files with non-standard column names
- [ ] Preview shows all errors inline before any data is written
- [ ] SELL rows that would exceed held quantity are flagged as errors in preview
- [ ] Confirmed import creates transactions with `source = IMPORT`
- [ ] Holdings and allocation math update correctly after import
- [ ] Export files open correctly in Excel and Numbers
- [ ] Export includes correct headers and formatted decimal values
- [ ] Large imports (500+ rows) complete without timeout
