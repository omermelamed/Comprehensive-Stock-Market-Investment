import { DOMAIN_FIELDS } from './useImport'

const IGNORE_VALUE = '(ignore)'

interface ColumnMappingTableProps {
  detectedColumns: string[]
  columnMapping: Record<string, string>
  onMappingChange: (domainField: string, detectedColumn: string) => void
}

const selectClass =
  'w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function ColumnMappingTable({
  detectedColumns,
  columnMapping,
  onMappingChange,
}: ColumnMappingTableProps) {
  const options = [IGNORE_VALUE, ...detectedColumns]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground w-1/3">
              Domain Field
            </th>
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground">
              CSV / Excel Column
            </th>
          </tr>
        </thead>
        <tbody>
          {DOMAIN_FIELDS.map(field => {
            const value = columnMapping[field.key] ?? IGNORE_VALUE
            const isMissingRequired = field.required && (value === IGNORE_VALUE || value === '')

            return (
              <tr key={field.key} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-4">
                  <span className="font-medium text-foreground">{field.label}</span>
                  {field.required ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">(required)</span>
                  ) : (
                    <span className="ml-1.5 text-xs text-muted-foreground">(optional)</span>
                  )}
                </td>
                <td className="py-2.5">
                  <select
                    className={[
                      selectClass,
                      isMissingRequired ? 'border-destructive/60 ring-0 focus:ring-destructive/40' : '',
                    ].join(' ')}
                    value={value}
                    onChange={e => onMappingChange(field.key, e.target.value)}
                  >
                    {options.map(col => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {isMissingRequired && (
                    <p className="mt-1 text-xs text-destructive">Required — select a column</p>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
