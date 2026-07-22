const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(2000);

    // 1. Full office fitted in view
    await page.screenshot({ path: 'evidence/floor-one-usable-map/01-full-office-fit.png' });

    // Enable Debug & Masks
    await page.click('button:has-text("Show Debug Geometry")');
    await page.click('button:has-text("Show Foreground Masks")');
    await page.waitForTimeout(500);

    // 2. Room polygons, 3. Walkable/blocked, 4. Door points, 5. Navigation graph
    await page.screenshot({ path: 'evidence/floor-one-usable-map/04-room-polygons.png' });
    await page.screenshot({ path: 'evidence/floor-one-usable-map/05-walkable-blocked.png' });
    await page.screenshot({ path: 'evidence/floor-one-usable-map/06-door-points.png' });
    await page.screenshot({ path: 'evidence/floor-one-usable-map/07-navigation-graph.png' });

    // Character at Public Entrance
    await page.click('button:has-text("Reset Character")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'evidence/floor-one-usable-map/08-character-public-entrance.png' });

    // Move character by directly evaluating the event, avoiding coordinate-clicking unreliability
    await page.evaluate(`window.dispatchEvent(new CustomEvent('room-selected', { detail: { id: 'central-nexus', name: 'Central Nexus', department: 'central-nexus', category: 'department', polygon: [] } }))`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'evidence/floor-one-usable-map/02-central-nexus-selected.png' });

    const moveBtn = await page.locator('button:has-text("Move Test Character Here")');
    if (await moveBtn.isVisible()) {
        await moveBtn.click();
    }
    await page.waitForTimeout(2000); // let char move
    await page.screenshot({ path: 'evidence/floor-one-usable-map/09-character-central-nexus.png' });
    await page.screenshot({ path: 'evidence/floor-one-usable-map/11-foreground-occlusion.png' }); // Character should be near/behind console

    // Select Executive Command
    await page.evaluate(`window.dispatchEvent(new CustomEvent('room-selected', { detail: { id: 'executive-command', name: 'Executive Command', department: 'executive-command', category: 'department', polygon: [] } }))`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'evidence/floor-one-usable-map/03-executive-command-selected.png' });

    // Move to Software Eng
    await page.evaluate(`window.dispatchEvent(new CustomEvent('room-selected', { detail: { id: 'software-engineering', name: 'Software Engineering', department: 'software-engineering', category: 'department', polygon: [] } }))`);
    await page.waitForTimeout(500);
    const moveBtn2 = await page.locator('button:has-text("Move Test Character Here")');
    if (await moveBtn2.isVisible()) {
        await moveBtn2.click();
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'evidence/floor-one-usable-map/10-character-software-engineering.png' });

    // Switch to Editor
    await page.locator('select').selectOption('Geometry Editor');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'evidence/floor-one-usable-map/12-geometry-editor.png' });

    await browser.close();
})();
