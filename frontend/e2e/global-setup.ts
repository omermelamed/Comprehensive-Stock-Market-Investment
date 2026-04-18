import type { FullConfig } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:8080'
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

async function waitForService(url: string, label: string, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        console.log(`  ✅ ${label} is up (${Date.now() - start}ms)`)
        return
      }
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 2_000))
  }
  throw new Error(`${label} did not become available within ${timeoutMs}ms at ${url}`)
}

export default async function globalSetup(_config: FullConfig) {
  console.log('\n🔍 Checking application readiness...\n')

  await waitForService(`${API_URL}/api/profile`, 'Backend API')
  await waitForService(BASE_URL, 'Frontend')

  console.log('\n✅ All services ready. Starting tests.\n')
}
