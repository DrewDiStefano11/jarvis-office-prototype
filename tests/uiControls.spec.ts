import { test, expect } from '@playwright/test';

test('Can toggle geometry modes via React UI', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  // Initial wait for load
  await page.waitForTimeout(1000);

  const debugBtn = page.locator('button:has-text("Show Debug Geometry")');
  await expect(debugBtn).toBeVisible();
  await debugBtn.click();

  const resetBtn = page.locator('button:has-text("Reset Character")');
  await expect(resetBtn).toBeVisible();
  await resetBtn.click();
});
