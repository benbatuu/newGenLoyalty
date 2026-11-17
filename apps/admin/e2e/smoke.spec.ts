import { test, expect } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /giriş|login/i })).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole('button', { name: /giriş yap/i }),
  ).toBeVisible();
});

test('login form has email field', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test('unauthenticated counter redirects to login', async ({ page }) => {
  await page.goto('/counter');
  await expect(page).toHaveURL(/\/login/);
});
