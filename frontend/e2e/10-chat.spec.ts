import { test, expect } from '@playwright/test'
import { seedAll } from './helpers/seed'

test.describe('AI Chat Panel — open, send message, close', () => {

  test.beforeAll(async () => {
    await seedAll()
  })

  test('Chat toggle button is visible on dashboard', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const chatBtn = page.getByLabel('Toggle AI chat')
    await expect(chatBtn).toBeVisible({ timeout: 15_000 })
  })

  test('Click chat toggle — panel slides open with "Portfolio AI" heading', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByLabel('Toggle AI chat').click()

    // Panel header should appear
    await expect(page.getByText('Portfolio AI')).toBeVisible({ timeout: 5_000 })

    // Empty state message should be visible
    await expect(page.getByText(/ask me anything about your portfolio/i)).toBeVisible()

    // Input textarea should be visible
    await expect(page.locator('textarea[placeholder="Ask about your portfolio..."]')).toBeVisible()
  })

  test('Type a message and send it', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByLabel('Toggle AI chat').click()
    await expect(page.getByText('Portfolio AI')).toBeVisible({ timeout: 5_000 })

    // Type a message
    const textarea = page.locator('textarea[placeholder="Ask about your portfolio..."]')
    await textarea.fill('How is my portfolio doing?')

    // Send via Enter key
    await textarea.press('Enter')

    // The user's message should appear in the chat
    await expect(page.getByText('How is my portfolio doing?')).toBeVisible({ timeout: 5_000 })

    // A loading indicator or response should appear (bounce dots or assistant message)
    // We wait briefly — if AI is mocked, a response shows; if real, loading dots show
    await page.waitForTimeout(3_000)

    // The empty state should be gone (messages exist now)
    await expect(page.getByText(/ask me anything about your portfolio/i)).not.toBeVisible()
  })

  test('Send button works (click instead of Enter)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByLabel('Toggle AI chat').click()
    await expect(page.getByText('Portfolio AI')).toBeVisible({ timeout: 5_000 })

    const textarea = page.locator('textarea[placeholder="Ask about your portfolio..."]')
    await textarea.fill('What is my best position?')

    // Click the Send button
    await page.getByLabel('Send message').click()

    await expect(page.getByText('What is my best position?')).toBeVisible({ timeout: 5_000 })
  })

  test('Clear conversation removes messages', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByLabel('Toggle AI chat').click()
    await expect(page.getByText('Portfolio AI')).toBeVisible({ timeout: 5_000 })

    // Send a message first
    const textarea = page.locator('textarea[placeholder="Ask about your portfolio..."]')
    await textarea.fill('Test message')
    await textarea.press('Enter')
    await expect(page.getByText('Test message')).toBeVisible({ timeout: 5_000 })

    // Click clear
    await page.getByLabel('Clear conversation').click()

    // Empty state should return
    await expect(page.getByText(/ask me anything about your portfolio/i)).toBeVisible({ timeout: 5_000 })
  })

  test('Close chat panel — panel disappears', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByLabel('Toggle AI chat').click()
    await expect(page.getByText('Portfolio AI')).toBeVisible({ timeout: 5_000 })

    // Close the panel
    await page.getByLabel('Close chat').click()

    // The panel heading should disappear
    await expect(page.getByText('Portfolio AI')).not.toBeVisible()

    // The toggle button should still be visible
    await expect(page.getByLabel('Toggle AI chat')).toBeVisible()
  })

  test('Chat persists across page navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open chat and send message
    await page.getByLabel('Toggle AI chat').click()
    await expect(page.getByText('Portfolio AI')).toBeVisible({ timeout: 5_000 })

    const textarea = page.locator('textarea[placeholder="Ask about your portfolio..."]')
    await textarea.fill('Persist test')
    await textarea.press('Enter')
    await expect(page.getByText('Persist test')).toBeVisible({ timeout: 5_000 })

    // Navigate to another page
    await page.getByRole('link', { name: 'Analytics' }).click()
    await page.waitForLoadState('networkidle')

    // Chat panel should still be open with the message
    await expect(page.getByText('Portfolio AI')).toBeVisible()
    await expect(page.getByText('Persist test')).toBeVisible()
  })
})
