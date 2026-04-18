import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { OptionsTransactionForm } from '@/features/options/OptionsTransactionForm'
import { useOptions } from '@/features/options/useOptions'
import type { CreateOptionsPositionRequest } from '@/api/options'

export default function OptionsTransactionFormPage() {
  const navigate = useNavigate()
  const { createPosition } = useOptions()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: CreateOptionsPositionRequest) => {
    setIsSubmitting(true)
    try {
      await createPosition(data)
      navigate('/options')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">New Options Position</h1>
          <Link
            to="/options"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Options
          </Link>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-xl">
          <div className="rounded-xl border border-border bg-card p-6">
            <OptionsTransactionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        </div>
      </div>
    </div>
  )
}
