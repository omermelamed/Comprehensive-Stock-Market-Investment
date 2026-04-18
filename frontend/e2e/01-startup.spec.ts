import { test, expect } from '@playwright/test'
import { seedAll } from './helpers/seed'

test.describe('App Startup — verify the application loads and renders', () => {

  test.beforeAll(async () => {
    await seedAll()
  })

  test('Homepage renders without crash screen', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The error boundary text should NOT be visible
    await expect(page.getByText('Something went wrong')).not.toBeVisible()

    // The root div should exist
    await expect(page.locator('#root')).toBeAttached()
  })

  test('Dashboard heading is visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })
  })

  test('Sidebar navigation links are visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Portfolio group
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Monthly Flow' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Allocations' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Transactions' })).toBeVisible()

    // Research group
    await expect(page.getByRole('link', { name: 'Watchlist' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Recommendations' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Analytics' })).toBeVisible()

    // Monitoring group
    await expect(page.getByRole('link', { name: 'Risk' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Alerts' })).toBeVisible()

    // Bottom links
    await expect(page.getByRole('link', { name: 'Import' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible()
  })

  test('Theme toggle button is visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Theme button shows "Light mode" or "Dark mode"
    const themeBtn = page.getByRole('button', { name: /light mode|dark mode/i })
    await expect(themeBtn).toBeVisible()
  })

  test('No CORS errors on page load', async ({ page }) => {
    const corsErrors: string[] = []
    page.on('console', msg => {
      if (msg.text().toLowerCase().includes('cors')) {
        corsErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(corsErrors).toHaveLength(0)
  })

  test('Chat toggle button is present', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const chatBtn = page.getByLabel('Toggle AI chat')
    await expect(chatBtn).toBeVisible()
  })
})
