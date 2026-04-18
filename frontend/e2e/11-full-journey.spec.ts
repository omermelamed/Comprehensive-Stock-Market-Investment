import { test, expect } from '@playwright/test'
import { seedEmptyPortfolio, seedAll } from './helpers/seed'
import { ensureProfile } from './helpers/api-client'
import { BASE_USER_PROFILE } from './fixtures/test-data'

/**
 * Complete user journey — from a seeded profile with empty portfolio
 * through first investment, dashboard verification, chat, and currency switch.
 *
 * This single long test walks the full happy path as a real user would.
 */
test.describe('Full User Journey', () => {

  test.beforeAll(async () => {
    // Start with a clean portfolio (profile + allocations, no transactions)
    await seedEmptyPortfolio()
  })

  test.afterAll(async () => {
    await ensureProfile(BASE_USER_PROFILE)
  })

  test('Complete journey: empty portfolio → invest → verify → chat → currency switch', async ({ page }) => {
    // ──────────────────────────────────────────────
    // STEP 1: Navigate to dashboard — verify empty state
    // ──────────────────────────────────────────────
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })

    // With no transactions, the holdings table should show empty state
    const noPositions = page.getByText(/no positions yet/i)
    const hasPositions = page.getByText(/\d+ position/)
    // One of these should be visible
    await expect(noPositions.or(hasPositions)).toBeVisible({ timeout: 10_000 })

    // ──────────────────────────────────────────────
    // STEP 2: Log a transaction via the form
    // ──────────────────────────────────────────────
    await page.getByRole('link', { name: 'Transactions' }).click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Log Transaction' })).toBeVisible({ timeout: 15_000 })

    // BUY 50 VOO at $200
    await page.locator('input[placeholder="e.g. VOO"]').fill('VOO')

    const numberInputs = page.locator('input[type="number"]')
    await numberInputs.nth(0).fill('50')  // Quantity
    await numberInputs.nth(1).fill('200') // Price Per Unit

    await page.getByRole('button', { name: /submit transaction/i }).click()
    await expect(page.getByText('Transaction logged successfully.')).toBeVisible({ timeout: 10_000 })

    // BUY 30 VXUS at $55
    await page.locator('input[placeholder="e.g. VOO"]').fill('VXUS')
    await numberInputs.nth(0).fill('30')
    await numberInputs.nth(1).fill('55')
    await page.getByRole('button', { name: /submit transaction/i }).click()
    await expect(page.getByText('Transaction logged successfully.')).toBeVisible({ timeout: 10_000 })

    // ──────────────────────────────────────────────
    // STEP 3: Return to dashboard — verify holdings appear
    // ──────────────────────────────────────────────
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Holdings')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('VXUS').first()).toBeVisible({ timeout: 5_000 })

    // Total portfolio value should be > 0
    const bigNumber = page.locator('.tabular-nums.font-mono.text-4xl').first()
    await expect(bigNumber).toBeVisible()
    const totalText = await bigNumber.textContent()
    expect(totalText).toBeTruthy()
    expect(totalText).toMatch(/[₪$€£]/)

    // ──────────────────────────────────────────────
    // STEP 4: Monthly Investment Flow
    // ──────────────────────────────────────────────
    await page.getByRole('link', { name: 'Monthly Flow' }).click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Monthly Investment' })).toBeVisible({ timeout: 15_000 })

    await page.locator('input[placeholder="Monthly budget"]').fill('3000')
    await page.getByRole('button', { name: 'Preview' }).click()

    // Wait for position cards
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    // Footer should show Budget/Allocated/Remaining
    await expect(page.getByText('Budget')).toBeVisible()
    await expect(page.getByText('Allocated')).toBeVisible()

    // Confirm the investment
    await page.getByRole('button', { name: 'Confirm Investment' }).click()
    await expect(page.getByText('Confirm investment')).toBeVisible({ timeout: 5_000 })

    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(page.getByText('Investment confirmed')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Done' }).click()

    // ──────────────────────────────────────────────
    // STEP 5: Open AI Chat
    // ──────────────────────────────────────────────
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await page.waitForLoadState('networkidle')

    await page.getByLabel('Toggle AI chat').click()
    await expect(page.getByText('Portfolio AI')).toBeVisible({ timeout: 5_000 })

    const textarea = page.locator('textarea[placeholder="Ask about your portfolio..."]')
    await textarea.fill('How is my portfolio?')
    await textarea.press('Enter')

    // User message should appear
    await expect(page.getByText('How is my portfolio?')).toBeVisible({ timeout: 5_000 })

    // Close chat
    await page.getByLabel('Close chat').click()
    await expect(page.getByText('Portfolio AI')).not.toBeVisible()

    // ──────────────────────────────────────────────
    // STEP 6: Visit Analytics page
    // ──────────────────────────────────────────────
    await page.getByRole('link', { name: 'Analytics' }).click()
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('heading', { name: 'Analytics' }).or(page.getByText('Analytics').first())
    ).toBeVisible({ timeout: 15_000 })

    // No crash
    await expect(page.getByText('Something went wrong')).not.toBeVisible()

    // ──────────────────────────────────────────────
    // STEP 7: Switch currency on Profile page
    // ──────────────────────────────────────────────
    await page.getByRole('link', { name: 'Profile' }).click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible({ timeout: 15_000 })

    // Find the currency select and switch to USD
    const allSelects = page.locator('select')
    const selectCount = await allSelects.count()
    for (let i = 0; i < selectCount; i++) {
      const options = await allSelects.nth(i).locator('option').allTextContents()
      if (options.includes('USD') && options.includes('ILS')) {
        await allSelects.nth(i).selectOption('USD')
        break
      }
    }

    await page.getByRole('button', { name: /save changes/i }).click()
    await page.waitForTimeout(2_000)

    // ──────────────────────────────────────────────
    // STEP 8: Return to dashboard — verify $ symbol instead of ₪
    // ──────────────────────────────────────────────
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await page.waitForLoadState('networkidle')

    const updatedNumber = page.locator('.tabular-nums.font-mono.text-4xl').first()
    await expect(updatedNumber).toBeVisible({ timeout: 15_000 })

    const updatedText = await updatedNumber.textContent()
    expect(updatedText).toContain('$')

    // ──────────────────────────────────────────────
    // STEP 9: Add alert
    // ──────────────────────────────────────────────
    await page.getByRole('link', { name: 'Alerts' }).click()
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="e.g. VOO"]').fill('VOO')
    await page.getByRole('button', { name: 'BELOW' }).click()
    await page.locator('input[placeholder="100.00"]').fill('180')
    await page.getByRole('button', { name: 'Set Alert' }).click()

    await page.waitForTimeout(2_000)
    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 5_000 })

    // ──────────────────────────────────────────────
    // STEP 10: Add watchlist item
    // ──────────────────────────────────────────────
    await page.getByRole('link', { name: 'Watchlist' }).click()
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="e.g. VOO"]').fill('GOOG')
    await page.getByRole('button', { name: 'Add' }).click()

    await expect(page.getByText('GOOG').first()).toBeVisible({ timeout: 10_000 })

    // ──────────────────────────────────────────────
    // JOURNEY COMPLETE
    // ──────────────────────────────────────────────
  })
})
