/**
 * Seeds the database with known test data via the backend API.
 * Call seedAll() before test suites that need the full portfolio state.
 */

import {
  ensureProfile,
  completeOnboarding,
  replaceAllocations,
  createTransaction,
  getTransactions,
  deleteTransaction,
} from './api-client'
import {
  BASE_USER_PROFILE,
  BASE_TARGET_ALLOCATIONS,
  BASE_TRANSACTIONS,
} from '../fixtures/test-data'

export async function clearTransactions() {
  const result = await getTransactions(0, 500)
  if (result.status === 200 && result.data?.content) {
    for (const tx of result.data.content as Array<{ id: string }>) {
      await deleteTransaction(tx.id)
    }
  }
}

export async function seedProfile() {
  await ensureProfile(BASE_USER_PROFILE)
}

export async function seedAllocations() {
  await replaceAllocations(BASE_TARGET_ALLOCATIONS)
}

export async function seedTransactions() {
  for (const tx of BASE_TRANSACTIONS) {
    await createTransaction(tx)
  }
}

export async function seedAll() {
  await seedProfile()
  await completeOnboarding()
  await seedAllocations()
  await clearTransactions()
  await seedTransactions()
}

export async function seedProfileOnly() {
  await seedProfile()
  await completeOnboarding()
}

export async function seedProfileAndAllocations() {
  await seedProfile()
  await completeOnboarding()
  await seedAllocations()
}

export async function seedEmptyPortfolio() {
  await seedProfile()
  await completeOnboarding()
  await seedAllocations()
  await clearTransactions()
}
