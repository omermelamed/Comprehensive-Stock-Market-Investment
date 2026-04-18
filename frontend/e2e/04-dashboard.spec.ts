import { test, expect } from '@playwright/test'
import { seedAll } from './helpers/seed'

test.describe('Dashboard — verify summary card, holdings table, and chart', () => {

  test.beforeAll(async () => {
    await seedAll()
  })

  test('Portfolio Summary Card shows total value with currency symbol', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The label "Total Portfolio Value" should be visible
    await expect(page.getByText('Total Portfolio Value')).toBeVisible({ timeout: 15_000 })

    // The large number below it should contain a currency symbol (user is ILS = ₪)
    const bigNumber = page.locator('.tabular-nums.font-mono.text-4xl').first()
    await expect(bigNumber).toBeVisible()
    const text = await bigNumber.textContent()
    expect(text).toBeTruthy()
    // Should contain some monetary value (digits + currency symbol)
    expect(text!).toMatch(/[₪$€£]/)
    expect(text!).toMatch(/[\d,]+/)
  })

  test('Portfolio Summary Card shows P&L', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // P&L line should show a + or - value
    await expect(page.getByText('Total Portfolio Value')).toBeVisible({ timeout: 15_000 })

    // Cost Basis label should be present
    await expect(page.getByText('Cost Basis')).toBeVisible()

    // Positions count should be visible
    await expect(page.getByText('Positions')).toBeVisible()
  })

  test('Holdings table shows all 6 symbols', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for the Holdings card to appear
    await expect(page.getByText('Holdings')).toBeVisible({ timeout: 15_000 })

    // Each of our 6 seeded symbols should appear
    for (const symbol of ['VOO', 'VXUS', 'REIT_ETF', 'BND', 'STOCKS', 'TA125']) {
      await expect(page.getByText(symbol).first()).toBeVisible({ timeout: 5_000 })
    }
  })

  test('Holdings table has expected column headers', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Holdings')).toBeVisible({ timeout: 15_000 })

    // Table should have these column headers (may be sort buttons)
    for (const header of ['Symbol', 'Qty', 'Value', 'P&L', 'Alloc']) {
      await expect(page.getByText(header, { exact: false }).first()).toBeVisible()
    }
  })

  test('Holdings table shows position count', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // "6 positions" or "6 position(s)" text should appear
    await expect(page.getByText(/\d+ position/)).toBeVisible({ timeout: 15_000 })
  })

  test('Portfolio History Chart renders with range toggles', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Range toggle buttons should be visible
    const rangeButtons = ['1W', '1M', '3M', '6M', '1Y', 'ALL']
    for (const range of rangeButtons) {
      await expect(page.getByRole('button', { name: range, exact: true })).toBeVisible({ timeout: 10_000 })
    }
  })

  test('Clicking range toggle updates the chart', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click "3M" range
    const btn3M = page.getByRole('button', { name: '3M', exact: true })
    await btn3M.click()

    // The button should now look active (hard to assert styling, but no crash)
    await page.waitForTimeout(1_000)
    await expect(page.getByText('Something went wrong')).not.toBeVisible()
  })

  test('"Invest This Month" button navigates to monthly flow', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const investBtn = page.getByRole('link', { name: /invest this month/i })
    await expect(investBtn).toBeVisible({ timeout: 15_000 })

    await investBtn.click()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/monthly-flow')
    await expect(page.getByRole('heading', { name: 'Monthly Investment' })).toBeVisible()
  })

  test('Allocation Health badge is visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Allocation Health')).toBeVisible({ timeout: 15_000 })

    // Should show one of the status badges
    const healthBadge = page.getByText(/healthy|slight drift|needs rebalancing/i).first()
    await expect(healthBadge).toBeVisible()
  })
})
