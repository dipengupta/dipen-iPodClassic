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
    // Concerts Seen moved out of Music into Odds & Ends.
    await expect(sidebar.getByRole('button', { name: 'Concerts Seen', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: "Dipen's iPod" })).toBeVisible();
    // Transport lives in the top toolbar; there is no bottom player bar.
    await expect(page.getByTestId('itunes-toolbar')).toBeVisible();
    await expect(page.getByTestId('itunes-audiobar')).toHaveCount(0);
  });

  test('PLAYLISTS section lists playlists and opens one', async ({ page }) => {
    const sidebar = page.getByTestId('itunes-sidebar');
    await expect(sidebar.getByText('PLAYLISTS', { exact: true })).toBeVisible();
    const firstPlaylist = page.getByTestId('itunes-playlist').first();
    await expect(firstPlaylist).toBeVisible();
    await firstPlaylist.click();
    // A Spotify playlist opens a track table; the status bar counts songs.
    await expect(page.getByTestId('itunes-statusbar')).toContainText(/\d+\s+songs?/);
  });

  test('images: Grid by default, status-bar size slider, Cover Flow shows the caption below', async ({ page }) => {
    await page.getByTestId('itunes-sidebar').getByRole('button', { name: 'Guitars', exact: true }).click();
    await expect(page.getByTestId('itunes-grid')).toBeVisible();
    await expect(page.getByTestId('itunes-coverflow')).toHaveCount(0);
    // The artwork-size slider lives in the status bar for galleries.
    const slider = page.getByTestId('itunes-imageslider').getByLabel('Image size');
    await expect(slider).toBeVisible();
    await slider.fill('1.4');
    // Switch to Cover Flow; the caption (title + description) shows beneath.
    await page.getByTestId('itunes-toolbar').getByRole('button', { name: 'Cover Flow' }).click();
    await expect(page.getByTestId('itunes-coverflow')).toBeVisible();
    await expect(page.getByTestId('itunes-coverflow-caption')).not.toBeEmpty();
    // The horizontal scrubber moves through the covers.
    const scrubber = page.getByTestId('itunes-coverflow-scroll');
    await expect(scrubber).toBeVisible();
    await scrubber.fill('2');
    await expect(page.getByTestId('itunes-coverflow-caption')).toContainText('3 of');
  });

  test('playlists: arrow keys + Enter play a song (no double-click)', async ({ page }) => {
    // Only Spotify playlists render as buttons (Apple ones link out).
    await page.getByTestId('itunes-playlist').first().click();
    const table = page.getByTestId('itunes-tracktable');
    await expect(table.locator('tbody tr').first()).toBeVisible();
    await table.press('ArrowDown');
    await table.press('Enter');
    // The played row gets the "current" highlight (set immediately on play).
    await expect(page.getByTestId('itunes-main').locator('tr[class*="current"]')).toBeVisible({
      timeout: 8000,
    });
  });

  test('pennguytweets renders a Twitter-style feed with a Shuffle toggle', async ({ page }) => {
    await page.getByTestId('itunes-sidebar').getByRole('button', { name: 'pennguytweets', exact: true }).click();
    const feed = page.getByTestId('itunes-tweets');
    await expect(feed).toBeVisible();
    await expect(feed.locator('article').first()).toBeVisible();
    await page.getByRole('button', { name: 'Shuffle' }).click();
    await expect(feed.locator('article').first()).toBeVisible();
  });

  test('About opens straight to the text (no entry-list tier)', async ({ page }) => {
    await page.getByTestId('itunes-sidebar').getByRole('button', { name: 'About', exact: true }).click();
    const main = page.getByTestId('itunes-main');
    await expect(main.getByRole('heading', { name: 'About' })).toBeVisible();
    // Single-entry reading sections drop the in-pane list.
    await expect(main.getByRole('navigation', { name: 'Entries' })).toHaveCount(0);
  });

  test('the sidebar can be dragged wider', async ({ page }) => {
    const sidebar = page.getByTestId('itunes-sidebar');
    const before = (await sidebar.boundingBox())!.width;
    const divider = page.getByTestId('itunes-sidebar-divider');
    const box = (await divider.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    const after = (await sidebar.boundingBox())!.width;
    expect(after).toBeGreaterThan(before + 60);
  });

  test('SoundCloud shows a library-style track list', async ({ page }) => {
    await page.getByTestId('itunes-sidebar').getByRole('button', { name: 'SoundCloud', exact: true }).click();
    // Live widget tracks (or the seeded link-out fallback) render as a table.
    await expect(page.getByTestId('itunes-main').locator('table tbody tr').first()).toBeVisible({
      timeout: 12000,
    });
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
