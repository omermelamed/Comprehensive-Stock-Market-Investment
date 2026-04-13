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
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/options"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Options
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-foreground">New Options Position</h1>

      <div className="max-w-xl">
        <div className="rounded-xl border border-border bg-card p-6">
          <OptionsTransactionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
      </div>
    </div>
  )
}
