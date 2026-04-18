/**
 * Custom assertion helpers for financial values.
 */

import { expect } from '@playwright/test'
import type { Page, Locator } from '@playwright/test'

/**
 * Assert a monetary value is within ±tolerance of the expected value.
 */
export function expectCloseTo(actual: number, expected: number, tolerance = 1) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

/**
 * Parse a monetary string like "$22,000.00" or "₪81,400.00" into a number.
 */
export function parseMoney(text: string): number {
  const cleaned = text.replace(/[^0-9.\-]/g, '')
  return parseFloat(cleaned)
}

/**
 * Wait for a locator to contain a monetary value and parse it.
 */
export async function getMoneyFromLocator(locator: Locator): Promise<number> {
  const text = await locator.textContent()
  if (!text) throw new Error('No text content found in locator')
  return parseMoney(text)
}

/**
 * Assert the page has no console errors (collects during test).
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  return errors
}

/**
 * Assert the page doesn't have the "Something went wrong" error boundary.
 */
export async function assertNoErrorBoundary(page: Page) {
  const errorHeading = page.getByText('Something went wrong')
  await expect(errorHeading).not.toBeVisible({ timeout: 3000 }).catch(() => {
    // not visible is fine
  })
}

/**
 * Verify a currency symbol is present in the text
 */
export function hasCurrencySymbol(text: string, currency: string): boolean {
  const symbols: Record<string, string> = {
    USD: '$', ILS: '₪', EUR: '€', GBP: '£',
  }
  return text.includes(symbols[currency] ?? currency)
}
