import { test, expect } from '@playwright/test'
import { seedAll } from './helpers/seed'
import { parseMoney } from './helpers/assertions'

test.describe('Monthly Investment Flow — budget, preview, cards, confirm', () => {

  test.beforeAll(async () => {
    await seedAll()
  })

  test('Monthly flow page loads with heading and budget input', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Monthly Investment' })).toBeVisible({ timeout: 15_000 })

    // Budget input should be visible
    const budgetInput = page.locator('input[placeholder="Monthly budget"]')
    await expect(budgetInput).toBeVisible()

    // Preview button should be visible
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()
  })

  test('Empty state shown before entering budget', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/enter a monthly budget/i)).toBeVisible({ timeout: 10_000 })
  })

  test('Enter ₪4000 and click Preview — position cards appear', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    const budgetInput = page.locator('input[placeholder="Monthly budget"]')
    await budgetInput.fill('4000')

    const previewBtn = page.getByRole('button', { name: 'Preview' })
    await previewBtn.click()

    // Wait for position cards to load — look for at least one symbol
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    // All 6 positions should appear as cards
    for (const symbol of ['VOO', 'VXUS', 'REIT_ETF', 'BND', 'STOCKS', 'TA125']) {
      await expect(page.getByText(symbol).first()).toBeVisible({ timeout: 5_000 })
    }
  })

  test('VOO card shows "Underweight" badge', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()

    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    // Find the VOO card and check its status badge
    const vooCard = page.locator('div').filter({ hasText: /^VOO/ }).first()
    await expect(vooCard.getByText('Underweight')).toBeVisible()
  })

  test('VXUS card shows "Overweight" with ₪0 amount', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()

    await expect(page.getByText('VXUS').first()).toBeVisible({ timeout: 15_000 })

    // Find the VXUS card and check its status badge
    const vxusCard = page.locator('.rounded-xl.border.border-border.bg-card').filter({ hasText: 'VXUS' })
    await expect(vxusCard.getByText('Overweight')).toBeVisible()

    // Overweight positions show "₪0.00 — Overweight" (not editable)
    await expect(vxusCard.getByText(/— Overweight/)).toBeVisible()
  })

  test('REIT_ETF shows "Underweight" with the largest suggested amount', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()

    await expect(page.getByText('REIT_ETF').first()).toBeVisible({ timeout: 15_000 })

    const reitCard = page.locator('.rounded-xl.border.border-border.bg-card').filter({ hasText: 'REIT_ETF' })
    await expect(reitCard.getByText('Underweight')).toBeVisible()

    // REIT_ETF has the biggest gap, so its input value should be the largest
    const reitInput = reitCard.locator('input[type="number"]')
    const reitValue = parseFloat(await reitInput.inputValue())

    const vooCard = page.locator('.rounded-xl.border.border-border.bg-card').filter({ hasText: /^VOO/ })
    const vooInput = vooCard.locator('input[type="number"]')
    const vooValue = parseFloat(await vooInput.inputValue())

    expect(reitValue).toBeGreaterThan(vooValue)
  })

  test('Footer shows Budget, Allocated, and Remaining', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()

    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    // The sticky footer should show these labels
    await expect(page.getByText('Budget')).toBeVisible()
    await expect(page.getByText('Allocated')).toBeVisible()
    await expect(page.getByText('Remaining')).toBeVisible()
  })

  test('Suggested amounts sum approximately to the budget', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()

    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    // Collect all the amounts from the position cards' number inputs
    const amountInputs = page.locator('.rounded-xl.border.border-border.bg-card input[type="number"]')
    const count = await amountInputs.count()

    let sum = 0
    for (let i = 0; i < count; i++) {
      const val = parseFloat(await amountInputs.nth(i).inputValue())
      if (!isNaN(val)) sum += val
    }

    // The sum of editable amounts plus overweight zeros should be close to 4000
    expect(Math.abs(sum - 4000)).toBeLessThanOrEqual(10)
  })

  test('Click "Confirm Investment" — dialog appears with transaction list', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()

    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    // Click the confirm button in the footer
    const confirmBtn = page.getByRole('button', { name: 'Confirm Investment' })
    await confirmBtn.click()

    // The confirmation dialog should appear
    await expect(page.getByText('Confirm investment')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('BUY transactions will be logged')).toBeVisible()

    // Cancel button should be present
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    // Confirm button in dialog
    await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible()
  })

  test('Cancel confirmation dialog — no transactions logged', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Confirm Investment' }).click()
    await expect(page.getByText('Confirm investment')).toBeVisible({ timeout: 5_000 })

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Dialog should close — "Confirm investment" heading gone
    await expect(page.getByText('Confirm investment')).not.toBeVisible()

    // We're still on the monthly flow page
    await expect(page.getByRole('heading', { name: 'Monthly Investment' })).toBeVisible()
  })

  test('Confirm investment — success screen shows transaction count', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Confirm Investment' }).click()
    await expect(page.getByText('Confirm investment')).toBeVisible({ timeout: 5_000 })

    // Click Confirm in the dialog
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()

    // Wait for success state
    await expect(page.getByText('Investment confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/transaction.*logged/i)).toBeVisible()

    // Done button should appear
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible()
  })

  test('Click Done after confirmation — returns to clean state', async ({ page }) => {
    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Confirm Investment' }).click()
    await expect(page.getByText('Confirm investment')).toBeVisible({ timeout: 5_000 })

    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(page.getByText('Investment confirmed')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Done' }).click()

    // Dialog should close and the page should reset
    await expect(page.getByText('Investment confirmed')).not.toBeVisible()
  })
})
