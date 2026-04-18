import type { ImportPreviewRow } from '@/api/import'

const MAX_ROWS = 200

interface ImportPreviewTableProps {
  rows: ImportPreviewRow[]
  validCount: number
  errorCount: number
}

function StatusBadge({ status }: { status: 'OK' | 'ERROR' }) {
  if (status === 'OK') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-success/15 text-success">
        OK
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-destructive/15 text-destructive">
      ERROR
    </span>
  )
}

export function ImportPreviewTable({ rows, validCount, errorCount }: ImportPreviewTableProps) {
  const shown = rows.slice(0, MAX_ROWS)
  const truncated = rows.length > MAX_ROWS

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {validCount} valid
        </span>
        {errorCount > 0 && (
          <span className="text-sm font-semibold text-destructive tabular-nums">
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          ({rows.length} rows total)
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-10">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map(row => (
              <tr
                key={row.rowIndex}
                className={row.status === 'ERROR' ? 'bg-destructive/5' : 'hover:bg-muted/50'}
              >
                <td className="px-4 py-3 tabular-nums font-mono text-xs text-muted-foreground">{row.rowIndex}</td>
                <td className="px-4 py-3 font-mono font-semibold text-foreground">
                  {row.parsedRow?.symbol ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{row.parsedRow?.transactionType ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums font-mono text-xs text-muted-foreground">
                  {row.parsedRow?.transactionDate ?? '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-mono text-xs text-foreground">
                  {row.parsedRow?.quantity ?? '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-mono text-xs text-foreground">
                  {row.parsedRow?.pricePerUnit ?? '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-xs text-destructive max-w-[260px]">
                  {row.errors.length > 0 ? row.errors.join('; ') : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {truncated && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          Showing first {MAX_ROWS} of {rows.length} rows. All valid rows will be imported on confirm.
        </p>
      )}
    </div>
  )
}
