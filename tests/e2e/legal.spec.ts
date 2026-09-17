import { test, expect } from '@playwright/test'

// Launch-critical legal surfaces. These must stay reachable WITHOUT an account (payment
// processors and both app stores check them before anyone signs in), and consent must be shown
// before every control that can create an account.

for (const [path, heading] of [
  ['/legal/privacy', 'Privacy Policy'],
  ['/legal/terms', 'Terms of Service'],
  ['/legal/delete-account', 'Deleting your PetCenza account'],
  ['/legal/accessibility', 'Accessibility']
] as const) {
  test(`${path} is public`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  })
}

test('terms name the operator and governing law', async ({ page }) => {
  await page.goto('/legal/terms')
  await expect(page.getByText(/operates PetCenza as an individual/)).toBeVisible()
  await expect(page.getByText(/laws of the State of Texas/)).toBeVisible()
})

test('sign-in shows consent before "Continue with Google", which can create an account', async ({ page }) => {
  await page.goto('/auth/sign-in')
  const consent = page.getByText(/By continuing you agree to our/)
  const google = page.getByRole('button', { name: 'Continue with Google' })
  await expect(consent).toBeVisible()
  const [c, g] = await Promise.all([consent.boundingBox(), google.boundingBox()])
  expect(c!.y).toBeLessThan(g!.y)
  // Apple sign-in was never configured; the button must not come back until it is.
  await expect(page.getByRole('button', { name: 'Continue with Apple' })).toHaveCount(0)
})

test('sign-up shows consent before the create-account button', async ({ page }) => {
  await page.goto('/auth/sign-up')
  const [c, b] = await Promise.all([
    page.getByText(/By continuing you agree to our/).boundingBox(),
    page.getByRole('button', { name: 'Create account' }).boundingBox()
  ])
  expect(c!.y).toBeLessThan(b!.y)
})

test('static legal files are served as files, not the app shell', async ({ request }) => {
  for (const path of ['/robots.txt', '/.well-known/security.txt']) {
    const res = await request.get(path)
    expect(res.ok()).toBeTruthy()
    expect(await res.text()).not.toContain('<div id="root">')
  }
})
