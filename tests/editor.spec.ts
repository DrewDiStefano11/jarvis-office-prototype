import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Map Editor supports import validation and undo/redo', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  // Switch to Map Editor view
  const select = page.locator('select');
  await select.selectOption('Geometry Editor');

  // Verify UI renders
  await expect(page.locator('h3:has-text("Editor Tools")')).toBeVisible();

  // Test invalid file upload
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Import Map JSON")'),
  ]);

  await fileChooser.setFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ map: { width: 9999 } })) // Invalid dimensions
  });

  await expect(page.locator('text=Import Validation Failed')).toBeVisible();
  await expect(page.locator('text=Invalid map dimensions')).toBeVisible();

  // Undo / Redo Buttons check (they shouldn't crash)
  await page.click('button:has-text("Undo")');
  await page.click('button:has-text("Redo")');
});
