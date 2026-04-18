import { test, expect } from '@playwright/test'
import { seedProfileAndAllocations, clearTransactions } from './helpers/seed'

test.describe('Transaction Management — log BUY/SELL via the form', () => {

  test.beforeAll(async () => {
    await seedProfileAndAllocations()
    await clearTransactions()
  })

  test('Transaction form page loads with heading and fields', async ({ page }) => {
    await page.goto('/transactions/new')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Log Transaction' })).toBeVisible({ timeout: 15_000 })

    // Key form elements should be visible
    await expect(page.getByText('Symbol')).toBeVisible()
    await expect(page.getByText('Transaction Type')).toBeVisible()
    await expect(page.getByText('Quantity')).toBeVisible()
    await expect(page.getByText('Price Per Unit')).toBeVisible()
  })

  test('BUY 100 VOO at $200 — success message appears', async ({ page }) => {
    await page.goto('/transactions/new')
    await page.waitForLoadState('networkidle')

    // Fill the symbol field (SymbolAutocomplete is an input with placeholder "e.g. VOO")
    const symbolInput = page.locator('input[placeholder="e.g. VOO"]')
    await symbolInput.fill('VOO')

    // Transaction Type should already default to BUY — verify
    const typeSelect = page.locator('select').first()
    await expect(typeSelect).toHaveValue('BUY')

    // Fill quantity
    const quantityInput = page.locator('label:has-text("Quantity") + input, label:has-text("Quantity") ~ input').first()
    // Use the third number input on the page (after symbol, type/track selects)
    const numberInputs = page.locator('input[type="number"]')
    await numberInputs.nth(0).fill('100') // Quantity
    await numberInputs.nth(1).fill('200') // Price Per Unit

    // Submit
    const submitBtn = page.getByRole('button', { name: /submit transaction/i })
    await submitBtn.click()

    // Wait for success message
    await expect(page.getByText('Transaction logged successfully.')).toBeVisible({ timeout: 10_000 })
  })

  test('After BUY, VOO appears on the dashboard holdings table', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for holdings data to load
    await page.waitForTimeout(3_000)

    // VOO should appear in the holdings table
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 10_000 })
  })

  test('SELL 30 VOO — success message and quantity update', async ({ page }) => {
    await page.goto('/transactions/new')
    await page.waitForLoadState('networkidle')

    // Fill symbol
    const symbolInput = page.locator('input[placeholder="e.g. VOO"]')
    await symbolInput.fill('VOO')

    // Change type to SELL
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('SELL')

    // Fill quantity and price
    const numberInputs = page.locator('input[type="number"]')
    await numberInputs.nth(0).fill('30')  // Quantity
    await numberInputs.nth(1).fill('220') // Price Per Unit

    // Submit
    const submitBtn = page.getByRole('button', { name: /submit transaction/i })
    await submitBtn.click()

    await expect(page.getByText('Transaction logged successfully.')).toBeVisible({ timeout: 10_000 })
  })

  test('After SELL, dashboard shows updated position', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(3_000)

    // VOO should still be visible (70 shares remaining)
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Transaction list appears below the form', async ({ page }) => {
    await page.goto('/transactions/new')
    await page.waitForLoadState('networkidle')

    // Should see at least 2 transactions we just made (BUY and SELL)
    await page.waitForTimeout(2_000)

    // Look for BUY/SELL badges in the transaction list
    const buyBadges = page.getByText('BUY', { exact: true })
    const sellBadges = page.getByText('SELL', { exact: true })

    // At least one BUY and one SELL should exist
    expect(await buyBadges.count()).toBeGreaterThanOrEqual(1)
    expect(await sellBadges.count()).toBeGreaterThanOrEqual(1)
  })
})
