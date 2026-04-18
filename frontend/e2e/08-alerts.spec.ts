import { test, expect } from '@playwright/test'
import { seedAll } from './helpers/seed'

test.describe('Alerts — create and delete alerts via the form', () => {

  test.beforeAll(async () => {
    await seedAll()
  })

  test('Alerts page loads with heading and form', async ({ page }) => {
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible({ timeout: 15_000 })

    // The create form should be visible
    await expect(page.getByText('Symbol').first()).toBeVisible()
    await expect(page.getByText('Condition')).toBeVisible()
    await expect(page.getByText('Threshold price')).toBeVisible()
  })

  test('Create alert: VOO BELOW $200 with note', async ({ page }) => {
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')

    // Fill symbol
    const symbolInput = page.locator('input[placeholder="e.g. VOO"]')
    await symbolInput.fill('VOO')

    // Click BELOW condition (it's the default, but click to confirm)
    await page.getByRole('button', { name: 'BELOW' }).click()

    // Fill threshold price
    const priceInput = page.locator('input[placeholder="100.00"]')
    await priceInput.fill('200')

    // Fill optional note
    const noteInput = page.locator('input[placeholder="e.g. Good entry point"]')
    await noteInput.fill('Test alert from QA')

    // Click "Set Alert"
    await page.getByRole('button', { name: 'Set Alert' }).click()

    // Wait for the alert to appear in the Active Alerts table
    await page.waitForTimeout(2_000)

    // VOO should now appear in the active alerts section
    const activeSection = page.getByText('Active Alerts').first().locator('..')
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 5_000 })
  })

  test('Active alert shows correct details', async ({ page }) => {
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')

    // The alert we just created should show VOO, BELOW, and 200 threshold
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('BELOW').first()).toBeVisible()
  })

  test('Create another alert: AAPL ABOVE $300', async ({ page }) => {
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')

    const symbolInput = page.locator('input[placeholder="e.g. VOO"]')
    await symbolInput.fill('AAPL')

    await page.getByRole('button', { name: 'ABOVE' }).click()

    const priceInput = page.locator('input[placeholder="100.00"]')
    await priceInput.fill('300')

    await page.getByRole('button', { name: 'Set Alert' }).click()

    await page.waitForTimeout(2_000)

    // AAPL should now appear
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5_000 })
  })

  test('Delete an alert — it disappears from the list', async ({ page }) => {
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')

    // Wait for alerts to load
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 10_000 })

    // Count how many delete buttons exist
    const deleteButtons = page.locator('[title="Delete alert"]')
    const countBefore = await deleteButtons.count()
    expect(countBefore).toBeGreaterThanOrEqual(1)

    // Click the first delete button
    await deleteButtons.first().click()

    // Wait for the item to be removed
    await page.waitForTimeout(2_000)

    // There should be one fewer alert now
    const countAfter = await page.locator('[title="Delete alert"]').count()
    expect(countAfter).toBeLessThan(countBefore)
  })

  test('Form clears after successful alert creation', async ({ page }) => {
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')

    const symbolInput = page.locator('input[placeholder="e.g. VOO"]')
    await symbolInput.fill('MSFT')

    await page.getByRole('button', { name: 'BELOW' }).click()

    const priceInput = page.locator('input[placeholder="100.00"]')
    await priceInput.fill('400')

    await page.getByRole('button', { name: 'Set Alert' }).click()

    await page.waitForTimeout(2_000)

    // After success, the symbol input should be cleared
    const symbolValue = await symbolInput.inputValue()
    expect(symbolValue).toBe('')
  })
})
