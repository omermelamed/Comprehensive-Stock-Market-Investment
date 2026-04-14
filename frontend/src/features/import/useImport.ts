import { useState } from 'react'
import { previewImport, confirmImport } from '@/api/import'
import type { ImportPreviewResponse, ParsedRow } from '@/api/import'

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'confirm'

// Domain fields with required flag
export const DOMAIN_FIELDS = [
  { key: 'symbol',          label: 'Symbol',           required: true },
  { key: 'type',            label: 'Type',             required: true },
  { key: 'quantity',        label: 'Quantity',         required: true },
  { key: 'price',           label: 'Price',            required: true },
  { key: 'date',            label: 'Date',             required: true },
  { key: 'track',           label: 'Track',            required: false },
  { key: 'notes',           label: 'Notes',            required: false },
  { key: 'fees',            label: 'Fees',             required: false },
  { key: 'currency',        label: 'Currency',         required: false },
] as const

export type DomainFieldKey = (typeof DOMAIN_FIELDS)[number]['key']

// Heuristic: try to auto-match detected column names to domain fields
function guessMapping(detectedColumns: string[]): Record<string, string> {
  const aliases: Record<DomainFieldKey, string[]> = {
    symbol:   ['symbol', 'ticker', 'stock', 'asset'],
    type:     ['type', 'action', 'transaction type', 'transactiontype', 'side'],
    quantity: ['quantity', 'qty', 'shares', 'amount', 'units'],
    price:    ['price', 'price per unit', 'unit price', 'cost', 'priceperunit'],
    date:     ['date', 'transaction date', 'trade date', 'transactiondate', 'tradedate'],
    track:    ['track', 'category', 'sector'],
    notes:    ['notes', 'note', 'comment', 'description'],
    fees:     ['fees', 'fee', 'commission'],
    currency: ['currency', 'ccy'],
  }

  const mapping: Record<string, string> = {}
  const lowerColumns = detectedColumns.map(c => c.toLowerCase().trim())

  for (const field of DOMAIN_FIELDS) {
    const candidates = aliases[field.key]
    const matched = lowerColumns.findIndex(col => candidates.includes(col))
    if (matched !== -1) {
      mapping[field.key] = detectedColumns[matched]
    }
  }

  return mapping
}

export interface UseImportReturn {
  step: ImportStep
  file: File | null
  detectedColumns: string[]
  columnMapping: Record<string, string>
  preview: ImportPreviewResponse | null
  previewing: boolean
  previewError: string | null
  confirming: boolean
  confirmError: string | null
  importResult: { imported: number; skipped: number } | null

  setFile: (file: File | null) => void
  setColumnMapping: (mapping: Record<string, string>) => void
  setMappingField: (domainField: string, detectedColumn: string) => void

  canAdvanceUpload: boolean
  canAdvanceMapping: boolean
  canAdvancePreview: boolean

  goToMapping: () => void
  goToPreview: () => Promise<void>
  goBack: () => void
  confirm: () => Promise<void>
}

export function useImport(): UseImportReturn {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFileState] = useState<File | null>(null)
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)

  function setFile(f: File | null) {
    setFileState(f)
    // Reset downstream state when file changes
    setDetectedColumns([])
    setColumnMapping({})
    setPreview(null)
    setPreviewError(null)
    setImportResult(null)
  }

  function setMappingField(domainField: string, detectedColumn: string) {
    setColumnMapping(prev => ({ ...prev, [domainField]: detectedColumn }))
  }

  const requiredFields = DOMAIN_FIELDS.filter(f => f.required).map(f => f.key)

  const canAdvanceUpload = file !== null

  const canAdvanceMapping = requiredFields.every(key => {
    const val = columnMapping[key]
    return val !== undefined && val !== '' && val !== '(ignore)'
  })

  const canAdvancePreview = preview !== null && preview.validCount > 0

  async function goToPreview() {
    if (!file || !canAdvanceMapping) return
    setPreviewing(true)
    setPreviewError(null)
    try {
      const result = await previewImport(file, columnMapping)
      setDetectedColumns(result.detectedColumns)
      // Apply auto-mapping if we don't have one yet
      if (Object.keys(columnMapping).length === 0 && result.detectedColumns.length > 0) {
        setColumnMapping(guessMapping(result.detectedColumns))
      }
      setPreview(result)
      setStep('preview')
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview failed. Check the file format.')
    } finally {
      setPreviewing(false)
    }
  }

  function goBack() {
    if (step === 'mapping') setStep('upload')
    else if (step === 'preview') setStep('mapping')
    else if (step === 'confirm') setStep('preview')
  }

  async function confirm() {
    if (!preview) return
    const validRows = preview.rows
      .filter(r => r.status === 'OK' && r.parsedRow !== null)
      .map(r => r.parsedRow as ParsedRow)
    if (validRows.length === 0) return

    setConfirming(true)
    setConfirmError(null)
    try {
      const result = await confirmImport(validRows)
      setImportResult(result)
      setStep('confirm')
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Import failed. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  // On step 'mapping', if we have a file but no detected columns yet,
  // we run a lightweight preview to get column names.
  // We expose this via a separate action called from goToMapping.
  async function goToMappingWithDetection() {
    if (!file) return
    setPreviewing(true)
    setPreviewError(null)
    try {
      // Use an empty mapping to just detect columns
      const result = await previewImport(file, {})
      setDetectedColumns(result.detectedColumns)
      setColumnMapping(guessMapping(result.detectedColumns))
      setStep('mapping')
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Could not read file columns. Check the file format.')
    } finally {
      setPreviewing(false)
    }
  }

  return {
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
    setColumnMapping,
    setMappingField,

    canAdvanceUpload,
    canAdvanceMapping,
    canAdvancePreview,

    goToMapping: goToMappingWithDetection,
    goToPreview,
    goBack,
    confirm,
  }
}
