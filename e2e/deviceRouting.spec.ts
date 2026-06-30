import { expect, test } from '@playwright/test';

// Device-aware view selection: desktops land on iTunes, small/portrait devices
// land on the iPod, and an explicit switch is remembered. See
// src/lib/device/viewRouting.ts.

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop routing');

  test('launches into iTunes', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/itunes$/);
    await expect(page.getByTestId('itunes-window')).toBeVisible();
  });

  test('a pinned iPod choice keeps desktop on the iPod', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ipod-view-pref', 'ipod'));
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('ipod')).toBeVisible();
  });

  test('switching to the iPod is remembered across a reload', async ({ page }) => {
    await page.goto('/itunes');
    await page.getByTestId('itunes-sidebar').getByRole('link', { name: "Dipen's iPod" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('ipod')).toBeVisible();
    // Reload: the choice sticks, so it does not bounce back to iTunes.
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('ipod')).toBeVisible();
  });
});

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch routing');

  test('launches into the iPod in portrait', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('ipod')).toBeVisible();
  });

  test('tilting to landscape switches to iTunes and back', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('ipod')).toBeVisible();

    // Rotate to landscape → iTunes (live, no reload).
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page).toHaveURL(/\/itunes$/);
    await expect(page.getByTestId('itunes-window')).toBeVisible();

    // Rotate back to portrait → iPod.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('ipod')).toBeVisible();
  });
});
