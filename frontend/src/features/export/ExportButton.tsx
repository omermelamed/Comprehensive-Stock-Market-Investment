import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, Loader2 } from 'lucide-react'

type ExportFormat = 'csv' | 'xlsx'

interface ExportButtonProps {
  label: string
  onDownload: (format: ExportFormat) => Promise<void>
}

export function ExportButton({ label, onDownload }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleDownload(format: ExportFormat) {
    setOpen(false)
    setLoading(true)
    try {
      await onDownload(format)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {label}
        {!loading && <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={() => void handleDownload('csv')}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted rounded-t-lg"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => void handleDownload('xlsx')}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted rounded-b-lg"
          >
            Excel (.xlsx)
          </button>
        </div>
      )}
    </div>
  )
}
