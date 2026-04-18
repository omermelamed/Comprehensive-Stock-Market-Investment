import { test, expect } from '@playwright/test'
import { seedAll, seedEmptyPortfolio } from './helpers/seed'

/**
 * Full onboarding wizard walkthrough — operates entirely through the browser.
 * Seed via API only creates profile+allocations so onboarding is already complete.
 * For onboarding tests, we rely on a profile that has NOT completed onboarding.
 *
 * NOTE: True onboarding reset requires DB-level profile deletion, which the API
 * doesn't expose. These tests verify the onboarding screens render and function
 * when the user IS already onboarded (redirect behavior) and test individual
 * components that are accessible post-onboarding.
 */
test.describe('Onboarding Flow', () => {

  test.describe('Redirect behavior — already onboarded user', () => {

    test.beforeAll(async () => {
      await seedAll()
    })

    test('Visiting /onboarding redirects to / when already completed', async ({ page }) => {
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      // Should redirect away from onboarding to dashboard
      expect(page.url()).not.toContain('/onboarding')
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })
    })

    test('Dashboard is directly accessible after onboarding', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      expect(page.url()).not.toContain('/onboarding')
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe('Allocation page — edits target allocations like onboarding step 3', () => {

    test.beforeAll(async () => {
      await seedAll()
    })

    test('Allocation page loads with current targets', async ({ page }) => {
      await page.goto('/allocations')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('heading', { name: 'Target Allocations' })).toBeVisible({ timeout: 15_000 })

      // Should see "100%" somewhere indicating full allocation
      await expect(page.getByText('100%')).toBeVisible()
    })

    test('Allocation page shows all 6 target symbols', async ({ page }) => {
      await page.goto('/allocations')
      await page.waitForLoadState('networkidle')

      for (const symbol of ['VOO', 'VXUS', 'REIT_ETF', 'BND', 'STOCKS', 'TA125']) {
        await expect(page.getByText(symbol, { exact: false })).toBeVisible({ timeout: 5_000 })
      }
    })

    test('Can add a new position row', async ({ page }) => {
      await page.goto('/allocations')
      await page.waitForLoadState('networkidle')

      const addBtn = page.getByRole('button', { name: /add position/i })
      await expect(addBtn).toBeVisible({ timeout: 10_000 })

      await addBtn.click()

      // A new row with empty inputs should appear — look for a new placeholder
      const newInputs = page.locator('input[placeholder="STOCKS"], input[placeholder="AAPL"]')
      await expect(newInputs.first()).toBeVisible({ timeout: 5_000 })
    })
  })

  test.describe('Profile page — post-onboarding editing', () => {

    test.beforeAll(async () => {
      await seedAll()
    })

    test('Profile page shows user name', async ({ page }) => {
      await page.goto('/profile')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible({ timeout: 15_000 })

      // The display name input should have the user's name
      const nameInput = page.locator('input[placeholder="Your name"]')
      await expect(nameInput).toBeVisible()

      const value = await nameInput.inputValue()
      expect(value.length).toBeGreaterThan(0)
    })

    test('Profile page shows currency selector', async ({ page }) => {
      await page.goto('/profile')
      await page.waitForLoadState('networkidle')

      // Currency dropdown should exist with the current value
      const currencySelect = page.locator('select').filter({ hasText: /USD|ILS|EUR|GBP/ }).first()
      await expect(currencySelect).toBeVisible()
    })

    test('Can update display name and save', async ({ page }) => {
      await page.goto('/profile')
      await page.waitForLoadState('networkidle')

      const nameInput = page.locator('input[placeholder="Your name"]')
      await nameInput.clear()
      await nameInput.fill('QA Tester')

      const saveBtn = page.getByRole('button', { name: /save changes/i })
      await saveBtn.click()

      // Wait for save confirmation or button to re-enable
      await page.waitForTimeout(2_000)

      // Reload and verify the name stuck
      await page.reload()
      await page.waitForLoadState('networkidle')

      const updatedValue = await page.locator('input[placeholder="Your name"]').inputValue()
      expect(updatedValue).toBe('QA Tester')
    })
  })
})
