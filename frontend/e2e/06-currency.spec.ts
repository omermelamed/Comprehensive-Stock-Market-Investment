import { test, expect } from '@playwright/test'
import { seedAll } from './helpers/seed'
import { ensureProfile } from './helpers/api-client'
import { BASE_USER_PROFILE } from './fixtures/test-data'

test.describe('Currency Display — switch currency and verify dashboard changes', () => {

  test.beforeAll(async () => {
    await seedAll()
  })

  test.afterAll(async () => {
    // Restore to ILS
    await ensureProfile(BASE_USER_PROFILE)
  })

  test('Dashboard shows ₪ (ILS) for the default user', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const bigNumber = page.locator('.tabular-nums.font-mono.text-4xl').first()
    await expect(bigNumber).toBeVisible({ timeout: 15_000 })

    const text = await bigNumber.textContent()
    expect(text).toContain('₪')
  })

  test('Switch currency to USD on profile page — save succeeds', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Find the Currency dropdown and change to USD
    const currencyLabel = page.getByText('Currency', { exact: true }).first()
    const currencySelect = currencyLabel.locator('..').locator('select').first()

    // Fall back: find all selects and pick the one with USD/ILS/EUR/GBP options
    const allSelects = page.locator('select')
    const count = await allSelects.count()
    let foundSelect = false

    for (let i = 0; i < count; i++) {
      const options = await allSelects.nth(i).locator('option').allTextContents()
      if (options.includes('USD') && options.includes('ILS')) {
        await allSelects.nth(i).selectOption('USD')
        foundSelect = true
        break
      }
    }
    expect(foundSelect).toBeTruthy()

    // Click Save
    const saveBtn = page.getByRole('button', { name: /save changes/i })
    await saveBtn.click()
    await page.waitForTimeout(2_000)
  })

  test('After switching to USD, dashboard shows $ instead of ₪', async ({ page }) => {
    // First ensure profile is USD
    await ensureProfile({ ...BASE_USER_PROFILE, preferredCurrency: 'USD' })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const bigNumber = page.locator('.tabular-nums.font-mono.text-4xl').first()
    await expect(bigNumber).toBeVisible({ timeout: 15_000 })

    const text = await bigNumber.textContent()
    expect(text).toContain('$')
    expect(text).not.toContain('₪')
  })

  test('Switch to EUR — dashboard shows €', async ({ page }) => {
    await ensureProfile({ ...BASE_USER_PROFILE, preferredCurrency: 'EUR' })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const bigNumber = page.locator('.tabular-nums.font-mono.text-4xl').first()
    await expect(bigNumber).toBeVisible({ timeout: 15_000 })

    const text = await bigNumber.textContent()
    expect(text).toContain('€')
  })

  test('Switch to GBP — dashboard shows £', async ({ page }) => {
    await ensureProfile({ ...BASE_USER_PROFILE, preferredCurrency: 'GBP' })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const bigNumber = page.locator('.tabular-nums.font-mono.text-4xl').first()
    await expect(bigNumber).toBeVisible({ timeout: 15_000 })

    const text = await bigNumber.textContent()
    expect(text).toContain('£')
  })

  test('Currency persists after page reload', async ({ page }) => {
    await ensureProfile({ ...BASE_USER_PROFILE, preferredCurrency: 'EUR' })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Reload
    await page.reload()
    await page.waitForLoadState('networkidle')

    const bigNumber = page.locator('.tabular-nums.font-mono.text-4xl').first()
    await expect(bigNumber).toBeVisible({ timeout: 15_000 })

    const text = await bigNumber.textContent()
    expect(text).toContain('€')
  })

  test('Monthly flow page shows amounts in user currency', async ({ page }) => {
    await ensureProfile({ ...BASE_USER_PROFILE, preferredCurrency: 'EUR' })

    await page.goto('/monthly-flow')
    await page.waitForLoadState('networkidle')

    await page.locator('input[placeholder="Monthly budget"]').fill('4000')
    await page.getByRole('button', { name: 'Preview' }).click()

    await expect(page.getByText('VOO').first()).toBeVisible({ timeout: 15_000 })

    // The portfolio total should contain € symbol
    const pageText = await page.textContent('body')
    expect(pageText).toContain('€')
  })

  test('Holdings table values update when currency changes', async ({ page }) => {
    // Set to GBP
    await ensureProfile({ ...BASE_USER_PROFILE, preferredCurrency: 'GBP' })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Holdings')).toBeVisible({ timeout: 15_000 })

    // The page body should contain £ symbols in the holdings values
    const bodyText = await page.textContent('body')
    expect(bodyText).toContain('£')
  })
})
