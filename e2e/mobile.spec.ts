import { expect, test, type Page } from '@playwright/test';

test.skip(({ isMobile }) => !isMobile, 'touch suite');

async function wheelGeometry(page: Page) {
  const box = (await page.getByTestId('click-wheel').boundingBox())!;
  return {
    cx: box.x + box.width / 2,
    cy: box.y + box.height / 2,
    r: box.width / 2,
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('ipod')).toBeVisible();
});

test('the device fills the mobile viewport', async ({ page }) => {
  const viewport = page.viewportSize()!;
  const device = (await page.getByTestId('ipod').boundingBox())!;
  expect(device.height).toBeGreaterThan(viewport.height * 0.8);
});

test('center tap selects, MENU-zone tap goes back', async ({ page }) => {
  const { cx, cy, r } = await wheelGeometry(page);
  await page.touchscreen.tap(cx, cy); // center → open Music
  await expect(page.getByTestId('status-bar')).toContainText('Music');
  await page.touchscreen.tap(cx, cy - r * 0.8); // MENU zone → back
  await expect(page.getByTestId('status-bar')).toContainText('iPod');
});

test('circular drag on the wheel scrubs the selection', async ({ page }) => {
  const { cx, cy, r } = await wheelGeometry(page);
  const ring = r * 0.78;
  const rows = page.getByTestId('menu-row');
  await expect(rows.first()).toHaveAttribute('data-selected', 'true');

  // Drag clockwise from 12 o'clock through ~150°.
  await page.mouse.move(cx, cy - ring);
  await page.mouse.down();
  for (let deg = 90; deg >= -60; deg -= 6) {
    const radians = (deg * Math.PI) / 180;
    await page.mouse.move(cx + ring * Math.cos(radians), cy - ring * Math.sin(radians));
  }
  await page.mouse.up();

  const selected = page.locator('[data-testid="menu-row"][data-selected]');
  await expect(selected).not.toHaveText('Music');
});

test('a scrub that ends on a tap zone does not trigger the zone', async ({ page }) => {
  const { cx, cy, r } = await wheelGeometry(page);
  const ring = r * 0.78;
  await page.touchscreen.tap(cx, cy); // into Music first
  await expect(page.getByTestId('status-bar')).toContainText('Music');

  // Scrub that happens to end at the MENU zone must not pop the menu.
  await page.mouse.move(cx + ring, cy);
  await page.mouse.down();
  for (let deg = 0; deg <= 90; deg += 6) {
    const radians = (deg * Math.PI) / 180;
    await page.mouse.move(cx + ring * Math.cos(radians), cy - ring * Math.sin(radians));
  }
  await page.mouse.up();
  await expect(page.getByTestId('status-bar')).toContainText('Music');
});
