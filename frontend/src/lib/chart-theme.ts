import type { CSSProperties } from 'react'

/*
 * Shared chart color tokens and style presets.
 *
 * CSS variables like var(--color-foreground) work in React inline styles
 * but NOT inside SVG attributes (Recharts) or libraries that need
 * resolved color strings (lightweight-charts). This module provides both:
 *
 *   - `chart`  — static hex/rgba values safe for any rendering context
 *   - `resolveVar` — resolves oklch CSS variables to rgb() at runtime
 *   - `recharts` — pre-built style objects for Recharts components
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SvgTick = any

/* ── Core palette ──────────────────────────────────────────── */

export const chart = {
  primary:    '#3b82f6',
  muted:      '#8896ab',
  success:    '#16a34a',
  danger:     '#dc2626',
  buy:        '#2563eb',
  sell:       '#d97706',

  grid:       'rgba(128, 128, 128, 0.2)',
  gridBorder: 'rgba(128, 128, 128, 0.25)',
  cursor:     'rgba(128, 128, 128, 0.12)',

  baseline: {
    topLine:       '#16a34a',
    topFill1:      'rgba(22, 163, 74, 0.12)',
    topFill2:      'rgba(22, 163, 74, 0.01)',
    bottomLine:    '#dc2626',
    bottomFill1:   'rgba(220, 38, 38, 0.01)',
    bottomFill2:   'rgba(220, 38, 38, 0.12)',
  },

  series: [
    '#6366f1', '#f59e0b', '#06b6d4', '#ec4899', '#10b981',
    '#8b5cf6', '#f97316', '#14b8a6', '#e11d48', '#3b82f6',
  ],
} as const

export function seriesColor(index: number): string {
  return chart.series[index % chart.series.length]
}

/**
 * Tailwind class pairs for use in chart legends, tooltips, and data-viz UI.
 * Keeps color choices consistent and easy to change in one place.
 */
export const tw = {
  pnlPositive:  'text-emerald-500',
  pnlNegative:  'text-red-500',
  dotPositive:  'bg-emerald-500',
  dotNegative:  'bg-red-500',
  buy:          'text-blue-500',
  sell:         'text-amber-500',
  accent:       'text-primary',

  emeraldText:  'text-emerald-500',
  emeraldBg:    'bg-emerald-500',
  emeraldBg15:  'bg-emerald-500/15',
  emeraldBg10:  'bg-emerald-500/10',
  violetText:   'text-violet-500',
  violetBg:     'bg-violet-500',
} as const

export function pnlClass(value: number) {
  return value >= 0 ? tw.pnlPositive : tw.pnlNegative
}

export function pnlDotClass(value: number) {
  return value >= 0 ? tw.dotPositive : tw.dotNegative
}

/* ── CSS-variable resolver ─────────────────────────────────── */

let _resolverCanvas: HTMLCanvasElement | null = null

/**
 * Resolves a CSS custom property (including oklch, hsl, etc.) to an
 * `rgb(r, g, b)` string that works everywhere — SVG attributes,
 * Canvas, lightweight-charts, Recharts inline styles.
 */
export function resolveVar(cssVar: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar).trim() || fallback
  if (!_resolverCanvas) {
    _resolverCanvas = document.createElement('canvas')
    _resolverCanvas.width = _resolverCanvas.height = 1
  }
  const ctx = _resolverCanvas.getContext('2d')
  if (!ctx) return fallback
  ctx.fillStyle = raw
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}

/* ── Recharts presets ──────────────────────────────────────── */

export const recharts = {
  grid: {
    strokeDasharray: '3 3',
    stroke: chart.grid,
  },

  xAxis: {
    tick: { fontSize: 11, fill: chart.muted } as SvgTick,
    stroke: chart.grid,
  },

  yAxis: {
    tick: { fontSize: 11, fill: chart.muted } as SvgTick,
    stroke: chart.grid,
  },

  tooltip: {
    cursor: { fill: chart.cursor },
    contentStyle: {
      background: 'var(--color-card)',
      border: `1px solid ${chart.gridBorder}`,
      borderRadius: '10px',
      fontSize: 12,
      color: 'var(--color-foreground)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    } as CSSProperties,
    labelStyle: {
      color: 'var(--color-foreground)',
      fontWeight: 600,
    } as CSSProperties,
    itemStyle: {
      color: 'var(--color-foreground)',
    } as CSSProperties,
  },

  legend: {
    wrapperStyle: {
      fontSize: 12,
      color: 'var(--color-foreground)',
    } as CSSProperties,
  },
} as const

/* ── lightweight-charts presets ─────────────────────────────── */

export function lwcTheme() {
  const mutedFg = resolveVar('--color-muted-foreground', '#64748b')
  const border = resolveVar('--color-border', '#e2e8f0')
  const primary = resolveVar('--color-primary', '#2563eb')

  return { mutedFg, border, primary }
}
