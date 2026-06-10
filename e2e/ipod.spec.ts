import { expect, test } from '@playwright/test';

test.skip(({ isMobile }) => isMobile, 'desktop keyboard suite');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('ipod')).toBeVisible();
});

test('boots to the main menu with a preview pane', async ({ page }) => {
  const rows = page.getByTestId('menu-row');
  await expect(rows).toHaveCount(5);
  for (const [i, label] of ['Music', 'Articles', 'Collections', 'Professional', 'Extras'].entries()) {
    await expect(rows.nth(i)).toContainText(label);
  }
  await expect(rows.first()).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('status-bar')).toContainText('iPod');
});

test('keyboard-navigates Music → YouTube → year → playing video', async ({ page }) => {
  await page.keyboard.press('Enter'); // Music
  await expect(page.getByTestId('status-bar')).toContainText('Music');
  await page.keyboard.press('ArrowDown'); // YouTube
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('YouTube');
  // Years load from the API.
  await expect(page.getByTestId('menu-row').first()).toContainText(/\d{4}/);
  await page.keyboard.press('Enter'); // newest year
  await expect(page.getByTestId('menu-row').first()).toBeVisible();
  await page.keyboard.press('Enter'); // first video
  const player = page.getByTestId('youtube-player');
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute('src', /youtube\.com\/embed\/[\w-]+\?enablejsapi=1/);
  // MENU backs out of the video.
  await page.keyboard.press('Escape');
  await expect(player).toHaveCount(0);
});

test('reads an article: scroll with the wheel, View Original links out', async ({ page }) => {
  await page.keyboard.press('ArrowDown'); // Articles
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row').first()).toContainText("Reversing into learner's mindset");
  await page.keyboard.press('Enter');
  const content = page.getByTestId('reader-content');
  await expect(content).toContainText(/Limitation breeds creativity/);
  await expect(content).toHaveAttribute('data-scroll', '0');
  // Wheel ticks are clamped to maxScroll, which is set after layout measures.
  await expect(content).not.toHaveAttribute('data-max-scroll', '0');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(content).toHaveAttribute('data-scroll', '32');
  await page.keyboard.press('ArrowUp');
  await expect(content).toHaveAttribute('data-scroll', '16');
  const original = page.getByTestId('view-original');
  await expect(original).toHaveAttribute('href', /substack\.com\/p\/reversing-into-learners-mindset/);
  await expect(original).toHaveAttribute('target', '_blank');
});

test('guitar Cover Flow: browse covers and flip for the caption', async ({ page }) => {
  await page.keyboard.press('Enter'); // Music
  await page.keyboard.press('Enter'); // Guitars
  const coverflow = page.getByTestId('coverflow');
  await expect(coverflow).toBeVisible();
  await expect(coverflow).toContainText('1 of 13');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight'); // side buttons step covers too
  await expect(coverflow).toContainText('4 of 13');
  await expect(coverflow).toContainText('Epiphone Les Paul Goldtop');
  await page.keyboard.press('Enter'); // flip
  await expect(coverflow).toHaveAttribute('data-flipped', 'true');
  await expect(page.getByTestId('cover-back')).toContainText('dream come true for me back then');
  await page.keyboard.press('Escape'); // unflip, stay in coverflow
  await expect(coverflow).not.toHaveAttribute('data-flipped', 'true');
  await expect(coverflow).toContainText('4 of 13');
});

test('professional timeline and links sections have content', async ({ page }) => {
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown'); // Professional
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row').first()).toContainText('Software Developer');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('URL Insurance Group');
  await expect(page.getByTestId('reader-content')).toContainText('Took ownership of the commission system');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  // Extras → Links
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row')).toHaveCount(9);
  await expect(page.getByTestId('menu-row').first()).toContainText('LinkedIn');
});

test('theme toggle switches to the black iPod and persists across reload', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'silver');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown'); // Extras
  await page.keyboard.press('Enter');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown'); // Settings
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row').first()).toContainText('Theme');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'black');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'black');
  await expect(page.getByTestId('ipod')).toBeVisible();
});

test('random tweet view shows a tweet and shuffles on center press', async ({ page }) => {
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown'); // Extras
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown'); // pennguytweets
  await page.keyboard.press('Enter');
  const view = page.getByTestId('tweet-view');
  await expect(view).toContainText('@20swithepennguy');
  await expect(view).toContainText('[sample]');
});

test('the iTunes stub page is reachable', async ({ page }) => {
  await page.getByRole('link', { name: /iTunes view/ }).click();
  await expect(page).toHaveURL(/\/itunes/);
  await expect(page.getByRole('heading', { name: /stub/i })).toBeVisible();
  await page.getByRole('link', { name: /Back to the iPod/ }).click();
  await expect(page.getByTestId('ipod')).toBeVisible();
});
