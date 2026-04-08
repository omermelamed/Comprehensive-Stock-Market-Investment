import { OptionsTransactionForm } from '../features/options/OptionsTransactionForm'

export default function OptionsTransactionFormPage() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Log Options Position</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a new options transaction. One contract = 100 shares.
        </p>
      </div>
      <OptionsTransactionForm />
    </div>
  )
}
