import { expect, test } from '@playwright/test';

test.describe('desktop iTunes view', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop-only companion');

  test.beforeEach(async ({ page }) => {
    await page.goto('/itunes');
    await expect(page.getByTestId('itunes-window')).toBeVisible();
  });

  test('renders the iTunes chrome and themed sidebar sections', async ({ page }) => {
    const sidebar = page.getByTestId('itunes-sidebar');
    for (const group of ['MUSIC', 'PHOTOS', 'COLLECTIONS', 'WRITING', 'ABOUT', 'ODDS & ENDS', 'DEVICES']) {
      await expect(sidebar.getByText(group, { exact: true })).toBeVisible();
    }
    await expect(sidebar.getByRole('button', { name: 'Guitars', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: "Dipen's iPod" })).toBeVisible();
    // Transport lives in the top toolbar; there is no bottom player bar.
    await expect(page.getByTestId('itunes-toolbar')).toBeVisible();
    await expect(page.getByTestId('itunes-audiobar')).toHaveCount(0);
  });

  test('the bottom status bar shows a section count', async ({ page }) => {
    // Default landing is Guitars (a gallery).
    await expect(page.getByTestId('itunes-statusbar')).toContainText(/\d+\s+guitars?/);
    await page.getByTestId('itunes-sidebar').getByRole('button', { name: 'Recommendations', exact: true }).click();
    await expect(page.getByTestId('itunes-statusbar')).toContainText(/\d+\s+songs?/);
  });

  test('images open in Grid by default, with a Cover Flow toggle that flips a cover', async ({ page }) => {
    await page.getByTestId('itunes-sidebar').getByRole('button', { name: 'Guitars', exact: true }).click();
    // Grid is the default; Cover Flow is not mounted yet.
    await expect(page.getByTestId('itunes-grid')).toBeVisible();
    await expect(page.getByTestId('itunes-coverflow')).toHaveCount(0);
    // Toggle (top-right of the toolbar) switches to Cover Flow.
    await page.getByTestId('itunes-toolbar').getByRole('button', { name: 'Cover Flow' }).click();
    const flow = page.getByTestId('itunes-coverflow');
    await expect(flow).toBeVisible();
    const focused = page.getByTestId('itunes-focused-cover');
    await focused.click();
    await expect(focused).toHaveClass(/flippedCard/);
  });

  test('YouTube mounts a video player', async ({ page }) => {
    await page.getByTestId('itunes-sidebar').getByRole('button', { name: 'YouTube', exact: true }).click();
    await expect(page.locator('iframe[src*="youtube.com/embed"]').first()).toBeAttached({
      timeout: 15000,
    });
  });

  test('Articles lazily loads a body into the reading pane', async ({ page }) => {
    await page.getByTestId('itunes-sidebar').getByRole('button', { name: 'Articles', exact: true }).click();
    const main = page.getByTestId('itunes-main');
    await expect(main.locator('h1').first()).toBeVisible();
  });

  test('DEVICES → Dipen\'s iPod navigates back to the iPod', async ({ page }) => {
    await page.getByTestId('itunes-sidebar').getByRole('link', { name: "Dipen's iPod" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('ipod')).toBeVisible();
  });
});

test.describe('iTunes on mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile redirect only');

  test('redirects small / touch screens to the iPod', async ({ page }) => {
    await page.goto('/itunes');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('ipod')).toBeVisible();
  });
});
