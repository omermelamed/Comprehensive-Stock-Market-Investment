import { test, expect } from '@playwright/test'
import { seedAll } from './helpers/seed'

const ROUTES: { path: string; heading: string }[] = [
  { path: '/',                heading: 'Dashboard' },
  { path: '/monthly-flow',   heading: 'Monthly Investment' },
  { path: '/allocations',    heading: 'Target Allocations' },
  { path: '/transactions/new', heading: 'Log Transaction' },
  { path: '/watchlist',      heading: 'Watchlist' },
  { path: '/recommendations', heading: 'Recommendations' },
  { path: '/analytics',      heading: 'Analytics' },
  { path: '/risk',           heading: 'Risk' },
  { path: '/alerts',         heading: 'Alerts' },
  { path: '/import',         heading: 'Import' },
  { path: '/profile',        heading: 'Profile' },
]

test.describe('Every page loads without crashing', () => {

  test.beforeAll(async () => {
    await seedAll()
  })

  for (const { path, heading } of ROUTES) {
    test(`${path} — renders "${heading}" without error boundary`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // The error boundary should NOT appear
      await expect(page.getByText('Something went wrong')).not.toBeVisible()

      // The page heading should be visible
      await expect(
        page.getByRole('heading', { name: heading }).or(page.getByText(heading).first())
      ).toBeVisible({ timeout: 15_000 })
    })
  }
})
