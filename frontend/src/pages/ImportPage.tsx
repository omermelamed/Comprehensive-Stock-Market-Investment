import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle2, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useImport } from '@/features/import/useImport'
import { ColumnMappingTable } from '@/features/import/ColumnMappingTable'
import { ImportPreviewTable } from '@/features/import/ImportPreviewTable'

type Step = 'upload' | 'mapping' | 'preview' | 'confirm'

const STEP_LABELS: Record<Step, string> = {
  upload:  '1. Upload',
  mapping: '2. Map Columns',
  preview: '3. Preview',
  confirm: '4. Done',
}

const STEP_ORDER: Step[] = ['upload', 'mapping', 'preview', 'confirm']

function StepBreadcrumb({ current }: { current: Step }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {STEP_ORDER.map((step, i) => {
        const isPast = STEP_ORDER.indexOf(current) > i
        const isCurrent = current === step
        return (
          <span key={step} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
            <span
              className={[
                isCurrent ? 'font-semibold text-foreground' : '',
                isPast ? 'text-success' : '',
              ].join(' ')}
            >
              {STEP_LABELS[step]}
            </span>
          </span>
        )
      })}
    </nav>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ImportPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    step,
    file,
    detectedColumns,
    columnMapping,
    preview,
    previewing,
    previewError,
    confirming,
    confirmError,
    importResult,
    setFile,
    setMappingField,
    canAdvanceUpload,
    canAdvanceMapping,
    canAdvancePreview,
    goToMapping,
    goToPreview,
    goBack,
    confirm,
  } = useImport()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Import Transactions</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Upload a CSV or Excel file to bulk-import transactions into your ledger.
            </p>
          </div>
          <StepBreadcrumb current={step} />
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <Card>
              <CardContent className="p-6 space-y-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Select File
                </h2>

                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-12 transition-colors hover:border-primary/50 hover:bg-muted/30"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Drop your file here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">CSV or Excel (.xlsx) up to 10 MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Selected file info */}
                {file && (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setFile(null) }}
                      className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {previewError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {previewError}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={!canAdvanceUpload || previewing}
                    onClick={() => void goToMapping()}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {previewing ? 'Reading file…' : 'Next: Map Columns'}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Column Mapping ── */}
          {step === 'mapping' && (
            <Card>
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Map Columns
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Match the columns in your file to the expected transaction fields.
                    Required fields must be mapped to proceed.
                  </p>
                </div>

                {detectedColumns.length > 0 ? (
                  <ColumnMappingTable
                    detectedColumns={detectedColumns}
                    columnMapping={columnMapping}
                    onMappingChange={setMappingField}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No columns detected — go back and re-upload.</p>
                )}

                {previewError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {previewError}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!canAdvanceMapping || previewing}
                    onClick={() => void goToPreview()}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {previewing ? 'Generating preview…' : 'Next: Preview'}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Preview ── */}
          {step === 'preview' && preview && (
            <Card>
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Review the parsed rows before importing. Only valid rows will be imported.
                    Rows with errors are skipped.
                  </p>
                </div>

                <ImportPreviewTable
                  rows={preview.rows}
                  validCount={preview.validCount}
                  errorCount={preview.errorCount}
                />

                {confirmError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {confirmError}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!canAdvancePreview || confirming}
                    onClick={() => void confirm()}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {confirming
                      ? 'Importing…'
                      : `Import ${preview.validCount} transaction${preview.validCount !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'confirm' && importResult && (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success" />
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Import Complete</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground tabular-nums">
                        {importResult.imported}
                      </span>{' '}
                      transaction{importResult.imported !== 1 ? 's' : ''} imported successfully.
                      {importResult.skipped > 0 && (
                        <>
                          {' '}
                          <span className="text-destructive tabular-nums">
                            {importResult.skipped}
                          </span>{' '}
                          skipped.
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/transactions/new')}
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    View Transactions
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
