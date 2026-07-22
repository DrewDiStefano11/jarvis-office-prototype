import { test, expect } from '@playwright/test';

test('Floor One Usable Map renders without errors', async ({ page }) => {
  // Listen for console errors
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:8080/');

  // Wait for the View Mode selector to be visible
  const select = page.locator('select');
  await expect(select).toBeVisible();

  // Ensure default is Floor 1
  await expect(select).toHaveValue('Floor 1 Usable Map');

  // Verify the Canvas is rendered
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // Give it a moment to load
  await page.waitForTimeout(2000);

  expect(errors.length).toBe(0);
});
