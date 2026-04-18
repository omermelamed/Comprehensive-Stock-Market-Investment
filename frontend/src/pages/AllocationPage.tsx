import { useEffect, useState } from 'react'
import { getAllocations, bulkReplaceAllocations } from '@/api/allocations'
import { getSymbolAliases, createSymbolAlias, deleteSymbolAlias, type SymbolAlias } from '@/api/symbol-aliases'
import { Card, CardContent } from '@/components/ui/card'
import { ASSET_TYPES } from '@/data/onboarding'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, Trash2, Settings2, Pencil, Check, X } from 'lucide-react'
import type { TargetAllocation } from '@/types'
import { UniversalChart } from '@/components/charts'

const inputClass =
  'rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

type DraftRow = {
  id: string
  symbol: string
  assetType: string
  label: string
  targetPercentage: number
  displayOrder: number
  parentSymbol: string | null
  isCategory: boolean
}

let draftCounter = 0

function toDraft(a: TargetAllocation, allAllocations: TargetAllocation[]): DraftRow {
  const parent = a.parentId ? allAllocations.find(p => String(p.id) === String(a.parentId)) : null
  return {
    id: String(a.id),
    symbol: a.symbol,
    assetType: a.assetType,
    label: a.label,
    targetPercentage: a.targetPercentage,
    displayOrder: a.displayOrder,
    parentSymbol: parent?.symbol ?? null,
    isCategory: a.isCategory,
  }
}

export default function AllocationPage() {
  const [rows, setRows] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Symbol aliases
  const [aliases, setAliases] = useState<SymbolAlias[]>([])
  const [showAliases, setShowAliases] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [newYahooSymbol, setNewYahooSymbol] = useState('')
  const [aliasError, setAliasError] = useState<string | null>(null)
  const [editingAliasId, setEditingAliasId] = useState<string | null>(null)
  const [editYahooSymbol, setEditYahooSymbol] = useState('')

  useEffect(() => {
    Promise.all([getAllocations(), getSymbolAliases().catch(() => [] as SymbolAlias[])])
      .then(([allocData, aliasData]) => {
        setRows(allocData.map(a => toDraft(a, allocData)))
        setAliases(aliasData)
        const cats = new Set(
          allocData.filter(a => a.isCategory).map(a => a.symbol.toUpperCase())
        )
        setExpandedCategories(cats)
      })
      .catch(() => setError('Failed to load allocations.'))
      .finally(() => setLoading(false))
  }, [])

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    setSaved(false)
  }

  function addRow() {
    draftCounter += 1
    setRows(prev => [
      ...prev,
      {
        id: `new-${draftCounter}`,
        symbol: '',
        assetType: 'ETF',
        label: '',
        targetPercentage: 0,
        displayOrder: prev.length,
        parentSymbol: null,
        isCategory: false,
      },
    ])
    setSaved(false)
  }

  function addCategory() {
    draftCounter += 1
    const id = `new-${draftCounter}`
    setRows(prev => [
      ...prev,
      {
        id,
        symbol: '',
        assetType: 'STOCK',
        label: '',
        targetPercentage: 0,
        displayOrder: prev.length,
        parentSymbol: null,
        isCategory: true,
      },
    ])
    setSaved(false)
  }

  function addChildRow(parentSymbol: string) {
    draftCounter += 1
    setRows(prev => {
      const updated = prev.map(r =>
        r.symbol.toUpperCase() === parentSymbol.toUpperCase() && !r.parentSymbol
          ? { ...r, isCategory: true }
          : r
      )
      return [
        ...updated,
        {
          id: `new-${draftCounter}`,
          symbol: '',
          assetType: 'STOCK',
          label: '',
          targetPercentage: 0,
          displayOrder: updated.length,
          parentSymbol: parentSymbol.toUpperCase(),
          isCategory: false,
        },
      ]
    })
    setExpandedCategories(prev => {
      const next = new Set(prev)
      next.add(parentSymbol.toUpperCase())
      return next
    })
    setSaved(false)
  }

  function removeRow(id: string) {
    setRows(prev => {
      const row = prev.find(r => r.id === id)
      if (!row) return prev
      const sym = row.symbol.toUpperCase()
      return prev.filter(r => r.id !== id && r.parentSymbol?.toUpperCase() !== sym)
    })
    setSaved(false)
  }

  function toggleCategory(symbol: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      const upper = symbol.toUpperCase()
      if (next.has(upper)) next.delete(upper)
      else next.add(upper)
      return next
    })
  }

  // A row is a category if it's explicitly marked OR has children pointing to it
  const symbolsWithChildren = new Set(
    rows.filter(r => r.parentSymbol).map(r => r.parentSymbol!.toUpperCase())
  )
  const isCategoryRow = (row: DraftRow): boolean =>
    row.isCategory || (!!row.symbol && symbolsWithChildren.has(row.symbol.toUpperCase()))

  const topLevelRows = rows.filter(r => !r.parentSymbol)
  const childrenOf = (symbol: string) =>
    rows.filter(r => r.parentSymbol?.toUpperCase() === symbol.toUpperCase())

  // Top-level total (parents + standalone, NOT children)
  const topTotal = topLevelRows.reduce((s, r) => s + (Number(r.targetPercentage) || 0), 0)
  const totalOk = Math.abs(topTotal - 100) <= 0.01

  async function handleSave() {
    for (const r of rows) {
      if (!r.symbol.trim()) {
        setError('All rows must have a symbol.')
        return
      }
    }

    if (Math.abs(topTotal - 100) > 0.01) {
      setError(`Top-level allocations must sum to 100%. Currently: ${topTotal.toFixed(2)}%`)
      return
    }

    // Validate children sum == parent percentage
    const catSymbols = topLevelRows.filter(isCategoryRow).map(r => r.symbol.toUpperCase())
    for (const parentSym of catSymbols) {
      const parent = rows.find(r => r.symbol.toUpperCase() === parentSym && !r.parentSymbol)
      if (!parent) continue
      const children = childrenOf(parentSym)
      const childSum = children.reduce((s, c) => s + (Number(c.targetPercentage) || 0), 0)
      if (Math.abs(childSum - parent.targetPercentage) > 0.01) {
        setError(
          `Children of "${parent.symbol}" sum to ${childSum.toFixed(2)}% but parent is ${parent.targetPercentage.toFixed(2)}%`
        )
        return
      }
    }

    setError(null)
    setSaving(true)
    try {
      const payload = rows.map((r, i) => ({
        symbol: r.symbol.trim().toUpperCase(),
        assetType: r.assetType,
        label: r.label.trim() || r.symbol.trim().toUpperCase(),
        targetPercentage: r.targetPercentage,
        displayOrder: i,
        parentId: r.parentSymbol?.toUpperCase() ?? null,
      }))
      const updated = await bulkReplaceAllocations(payload)
      setRows((updated as TargetAllocation[]).map(a => toDraft(a, updated as TargetAllocation[])))
      setSaved(true)
    } catch {
      setError('Failed to save allocations. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAlias() {
    if (!newAlias.trim() || !newYahooSymbol.trim()) {
      setAliasError('Both fields are required.')
      return
    }
    setAliasError(null)
    try {
      const created = await createSymbolAlias(newAlias, newYahooSymbol)
      setAliases(prev => [...prev.filter(a => a.alias !== created.alias), created])
      setNewAlias('')
      setNewYahooSymbol('')
    } catch {
      setAliasError('Failed to create alias.')
    }
  }

  async function handleDeleteAlias(id: string) {
    try {
      await deleteSymbolAlias(id)
      setAliases(prev => prev.filter(a => a.id !== id))
    } catch {
      setAliasError('Failed to delete alias.')
    }
  }

  function startEditAlias(alias: SymbolAlias) {
    setEditingAliasId(alias.id)
    setEditYahooSymbol(alias.yahooSymbol)
    setAliasError(null)
  }

  function cancelEditAlias() {
    setEditingAliasId(null)
    setEditYahooSymbol('')
  }

  async function saveEditAlias(alias: SymbolAlias) {
    if (!editYahooSymbol.trim()) {
      setAliasError('Yahoo symbol is required.')
      return
    }
    setAliasError(null)
    try {
      const updated = await createSymbolAlias(alias.alias, editYahooSymbol.trim())
      setAliases(prev => prev.map(a => (a.id === alias.id ? updated : a)))
      setEditingAliasId(null)
      setEditYahooSymbol('')
    } catch {
      setAliasError('Failed to update alias.')
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Target Allocations</h1>
          <div className="flex items-center gap-3">
            <span
              className={`tabular-nums text-sm font-mono font-semibold ${totalOk ? 'text-success' : 'text-destructive'}`}
            >
              {topTotal.toFixed(2)}% / 100%
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-5">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            Allocations saved.
          </p>
        )}

        {/* Visual allocation breakdown */}
        {topLevelRows.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-2 text-sm font-semibold text-foreground">Target Allocation</h2>
                <UniversalChart
                  chartId="allocation-target"
                  data={topLevelRows
                    .filter(r => r.targetPercentage > 0)
                    .map(r => ({
                      name: r.symbol || r.label || 'Unnamed',
                      value: r.targetPercentage,
                    }))}
                  defaultType="donut"
                  allowedTypes={['donut', 'bar', 'radar']}
                  formatCenterValue={(t) => `${t.toFixed(1)}%`}
                  centerLabel="Allocated"
                  formatValue={(v) => `${v.toFixed(1)}%`}
                  height={240}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-2 text-sm font-semibold text-foreground">By Asset Type</h2>
                <UniversalChart
                  chartId="allocation-by-asset"
                  data={Object.entries(
                    topLevelRows.reduce<Record<string, number>>((acc, r) => {
                      if (r.targetPercentage > 0) {
                        acc[r.assetType] = (acc[r.assetType] ?? 0) + r.targetPercentage
                      }
                      return acc
                    }, {}),
                  ).map(([type, pct]) => ({ name: type, value: pct }))}
                  defaultType="donut"
                  allowedTypes={['donut', 'bar', 'radar']}
                  formatCenterValue={(_, count) => `${count}`}
                  centerLabel="Asset types"
                  formatValue={(v) => `${v.toFixed(1)}%`}
                  height={240}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Allocations table */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Symbol
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Label
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Asset Type
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Target %
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {topLevelRows.map(row => {
                  const isCategory = isCategoryRow(row)
                  const expanded = expandedCategories.has(row.symbol.toUpperCase())
                  const children = childrenOf(row.symbol)
                  const childSum = children.reduce(
                    (s, c) => s + (Number(c.targetPercentage) || 0),
                    0
                  )
                  const childSumOk =
                    !isCategory || Math.abs(childSum - (Number(row.targetPercentage) || 0)) <= 0.01

                  return (
                    <CategoryOrRow
                      key={row.id}
                      row={row}
                      isCategory={isCategory}
                      expanded={expanded}
                      children={children}
                      childSum={childSum}
                      childSumOk={childSumOk}
                      onUpdate={updateRow}
                      onRemove={removeRow}
                      onToggle={() => toggleCategory(row.symbol)}
                      onAddChild={() => addChildRow(row.symbol)}
                    />
                  )
                })}
              </tbody>
            </table>

            {rows.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No allocations yet. Add your first position below.
              </p>
            )}

            <div className="flex items-center gap-4 border-t border-border px-6 py-3">
              <button onClick={addRow} className="text-sm font-medium text-primary hover:underline">
                + Add position
              </button>
              <button
                onClick={addCategory}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add category
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Symbol Aliases */}
        <Card>
          <CardContent className="p-0">
            <button
              onClick={() => setShowAliases(p => !p)}
              className="flex w-full items-center gap-2 px-6 py-4 text-left"
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Symbol Aliases</span>
              <span className="text-xs text-muted-foreground">
                Map friendly names to Yahoo Finance symbols
              </span>
              {showAliases ? (
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showAliases && (
              <div className="border-t border-border px-6 py-4 space-y-3">
                {aliasError && (
                  <p className="text-xs text-destructive">{aliasError}</p>
                )}

                {aliases.length > 0 && (
                  <table className="text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="pb-2 pr-8 text-left font-medium">Alias</th>
                        <th className="pb-2 pr-4 text-left font-medium">Yahoo Symbol</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {aliases.map(a => {
                        const isEditing = editingAliasId === a.id
                        return (
                          <tr key={a.id} className="border-t border-border/50">
                            <td className="py-2 pr-8 font-mono text-xs font-semibold">{a.alias}</td>
                            <td className="py-2 pr-4">
                              {isEditing ? (
                                <input
                                  className={`${inputClass} w-32 font-mono text-xs`}
                                  value={editYahooSymbol}
                                  onChange={e => setEditYahooSymbol(e.target.value)}
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveEditAlias(a)
                                    if (e.key === 'Escape') cancelEditAlias()
                                  }}
                                />
                              ) : (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {a.yahooSymbol}
                                </span>
                              )}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-1.5">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => saveEditAlias(a)}
                                      className="text-muted-foreground hover:text-success transition-colors"
                                      title="Save"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={cancelEditAlias}
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEditAlias(a)}
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAlias(a.id)}
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

                {aliases.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No aliases configured. Add one to map a friendly name (e.g. TA125) to the real
                    Yahoo Finance symbol (e.g. 195.TA).
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <input
                    className={`${inputClass} w-28 font-mono uppercase`}
                    placeholder="TA125"
                    value={newAlias}
                    onChange={e => setNewAlias(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <input
                    className={`${inputClass} w-32 font-mono`}
                    placeholder="195.TA"
                    value={newYahooSymbol}
                    onChange={e => setNewYahooSymbol(e.target.value)}
                  />
                  <button
                    onClick={handleAddAlias}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Category or standalone row ────────────────────────────────────────────────

interface RowProps {
  row: DraftRow
  isCategory: boolean
  expanded: boolean
  children: DraftRow[]
  childSum: number
  childSumOk: boolean
  onUpdate: (id: string, patch: Partial<DraftRow>) => void
  onRemove: (id: string) => void
  onToggle: () => void
  onAddChild: () => void
}

function CategoryOrRow({
  row,
  isCategory,
  expanded,
  children,
  childSum,
  childSumOk,
  onUpdate,
  onRemove,
  onToggle,
  onAddChild,
}: RowProps) {
  return (
    <>
      {/* Main row */}
      <tr
        className={cn(
          'border-b border-border last:border-0 transition-colors',
          isCategory ? 'bg-muted/20' : 'hover:bg-muted/30'
        )}
      >
        <td className="px-6 py-2">
          <div className="flex items-center gap-1.5">
            {isCategory && (
              <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <input
              className={`${inputClass} w-28 font-mono uppercase`}
              placeholder={isCategory ? 'STOCKS' : 'AAPL'}
              value={row.symbol}
              onChange={e => onUpdate(row.id, { symbol: e.target.value })}
            />
          </div>
        </td>
        <td className="px-3 py-2">
          <input
            className={`${inputClass} w-40`}
            placeholder={isCategory ? 'e.g. Individual Stocks' : 'e.g. S&P 500'}
            value={row.label}
            onChange={e => onUpdate(row.id, { label: e.target.value })}
          />
        </td>
        <td className="px-3 py-2">
          <select
            className={`${inputClass} w-36`}
            value={row.assetType}
            onChange={e => onUpdate(row.id, { assetType: e.target.value })}
          >
            {ASSET_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={`${inputClass} w-24 text-right font-mono`}
              value={row.targetPercentage}
              onChange={e => onUpdate(row.id, { targetPercentage: Number(e.target.value) })}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          {isCategory && (
            <div className="mt-0.5 text-right">
              <span
                className={cn(
                  'text-[10px] font-mono',
                  childSumOk ? 'text-muted-foreground' : 'text-destructive'
                )}
              >
                children: {childSum.toFixed(2)}%
              </span>
            </div>
          )}
        </td>
        <td className="px-6 py-2 text-right">
          <div className="flex items-center justify-end gap-2">
            {!isCategory && !row.parentSymbol && (
              <button
                onClick={onAddChild}
                title="Add sub-positions to make this a category"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onRemove(row.id)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Remove
            </button>
          </div>
        </td>
      </tr>

      {/* Children rows (indented) */}
      {isCategory &&
        expanded &&
        children.map(child => (
          <tr
            key={child.id}
            className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
          >
            <td className="py-2 pl-14 pr-6">
              <input
                className={`${inputClass} w-28 font-mono uppercase`}
                placeholder="NVDA"
                value={child.symbol}
                onChange={e => onUpdate(child.id, { symbol: e.target.value })}
              />
            </td>
            <td className="px-3 py-2">
              <input
                className={`${inputClass} w-40`}
                placeholder="e.g. Nvidia"
                value={child.label}
                onChange={e => onUpdate(child.id, { label: e.target.value })}
              />
            </td>
            <td className="px-3 py-2">
              <select
                className={`${inputClass} w-36`}
                value={child.assetType}
                onChange={e => onUpdate(child.id, { assetType: e.target.value })}
              >
                {ASSET_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-3 py-2">
              <div className="flex items-center justify-end gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  className={`${inputClass} w-24 text-right font-mono`}
                  value={child.targetPercentage}
                  onChange={e =>
                    onUpdate(child.id, { targetPercentage: Number(e.target.value) })
                  }
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </td>
            <td className="px-6 py-2 text-right">
              <button
                onClick={() => onRemove(child.id)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove
              </button>
            </td>
          </tr>
        ))}

      {/* Add child button inside expanded category */}
      {isCategory && expanded && (
        <tr className="border-b border-border/50">
          <td colSpan={5} className="pl-14 py-2">
            <button
              onClick={onAddChild}
              className="text-xs font-medium text-primary hover:underline"
            >
              + Add sub-position
            </button>
          </td>
        </tr>
      )}
    </>
  )
}
