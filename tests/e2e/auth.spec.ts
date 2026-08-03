import { test, expect } from '@playwright/test'

// Public routing + auth-page smoke tests. No live backend required.

test('sign-in page renders with all entry points', async ({ page }) => {
  await page.goto('/auth/sign-in')
  await expect(page.getByRole('heading', { name: 'PetCenza' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Forgot password' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible()
})

test('forgot-password route resolves (regression: used to be a dead link)', async ({ page }) => {
  await page.goto('/auth/sign-in')
  await page.getByRole('link', { name: 'Forgot password' }).click()
  await expect(page).toHaveURL(/\/auth\/forgot$/)
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
})

test('reset-password page waits for a valid recovery link', async ({ page }) => {
  await page.goto('/auth/reset')
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
  // The submit is disabled until a recovery session validates.
  await expect(page.getByRole('button', { name: 'Update password' })).toBeDisabled()
})

test('sign-up enforces a 12-character minimum password', async ({ page }) => {
  await page.goto('/auth/sign-up')
  await page.getByLabel('Your name').fill('Sam Owner')
  await page.getByLabel('Email').fill('sam@example.com')
  await page.getByLabel('Password (12+ characters)').fill('short')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert')).toContainText('at least 12 characters')
})

test('unknown URLs fall back to sign-in (catch-all → home → protected)', async ({ page }) => {
  await page.goto('/totally/unknown/path')
  await expect(page).toHaveURL(/\/auth\/sign-in$/)
})

test('a protected route bounces an unauthenticated user to sign-in', async ({ page }) => {
  await page.goto('/pets')
  await expect(page).toHaveURL(/\/auth\/sign-in$/)
})
