import { expect, test } from '@playwright/test';

test.skip(({ isMobile }) => isMobile, 'desktop keyboard suite');

test.beforeEach(async ({ page }) => {
  // On desktop the iPod is only shown when explicitly chosen; pin it so the
  // device-aware redirect doesn't send us to iTunes. Only seed the default when
  // unset, so tests that deliberately switch to iTunes aren't re-pinned here.
  await page.addInitScript(() => {
    try {
      if (!localStorage.getItem('ipod-view-pref')) {
        localStorage.setItem('ipod-view-pref', 'ipod');
      }
    } catch {
      /* private mode */
    }
  });
  await page.goto('/');
  await expect(page.getByTestId('ipod')).toBeVisible();
});

test('boots to the main menu with a preview pane', async ({ page }) => {
  const rows = page.getByTestId('menu-row');
  await expect(rows).toHaveCount(6);
  for (const [i, label] of ['Music', 'Collections', 'Professional', 'Articles', 'About', 'Misc'].entries()) {
    await expect(rows.nth(i)).toContainText(label);
  }
  await expect(rows.first()).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('status-bar')).toContainText("Dipen's iPod");
});

test('plays a YouTube video and keeps playing after MENU (persistent player)', async ({ page }) => {
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
  const stage = page.getByTestId('yt-stage');
  await expect(stage).toHaveAttribute('data-watching', 'true');
  // The IFrame API replaces the inner div with the player iframe.
  const playerFrame = page.locator('#ipod-yt-player');
  await expect(playerFrame).toBeAttached({ timeout: 15000 });
  // MENU backs out of the video view, but the player must STAY mounted so
  // the audio keeps going — the stage just drops behind the menu.
  await page.keyboard.press('Escape');
  await expect(stage).not.toHaveAttribute('data-watching', 'true');
  await expect(playerFrame).toBeAttached();
  await expect(page.getByTestId('menu-row').first()).toBeVisible();
});

test('Instagram (UGG Chronicles): year list, episode list, local video + caption overlay', async ({ page }) => {
  await page.keyboard.press('Enter'); // Music
  await page.keyboard.press('ArrowDown'); // YouTube
  await page.keyboard.press('ArrowDown'); // Instagram
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('Instagram');
  const rows = page.getByTestId('menu-row');
  // Years load from the API, most recent first.
  await expect(rows.first()).toContainText(/UGG Chronicles - 20\d\d/);
  await page.keyboard.press('Enter'); // newest year
  await expect(rows.first()).toContainText(/Ep\. \d+/);
  await page.keyboard.press('Enter'); // most recent episode
  const stage = page.getByTestId('ugg-stage');
  await expect(stage).toHaveAttribute('data-watching', 'true');
  const player = page.getByTestId('ugg-player');
  // Decoded playback needs the gitignored video files, so assert the wiring
  // (src), not frames.
  await expect(player).toHaveAttribute('src', /\/api\/video\/ugg-\d+\.mp4$/);
  // Center press summons the scrub bar; wheel ticks then seek, NOT the
  // caption (opacity-only overlays, so check aria state).
  await page.keyboard.press('Enter');
  const scrubOsd = page.getByTestId('scrub-osd');
  await expect(scrubOsd).toHaveAttribute('aria-hidden', 'false');
  await expect(scrubOsd).toContainText(/\d+:\d{2}/);
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('ugg-caption')).toHaveAttribute('aria-hidden', 'true');
  // MENU dismisses the scrubber first — we are still on the video.
  await page.keyboard.press('Escape');
  await expect(scrubOsd).toHaveAttribute('aria-hidden', 'true');
  await expect(stage).toHaveAttribute('data-watching', 'true');
  // Outside scrub mode a wheel tick summons the caption overlay.
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('ugg-caption')).toHaveAttribute('aria-hidden', 'false');
  // MENU backs out to the episode list, but the persistent player STAYS
  // mounted so the audio keeps going — the stage just drops behind the menu.
  await page.keyboard.press('Escape');
  await expect(stage).not.toHaveAttribute('data-watching', 'true');
  await expect(player).toBeAttached();
  await expect(rows.first()).toContainText(/Ep\. \d+/);
});

test('photos cover flow shows profile pics and flips to captions', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Misc
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('Misc');
  await page.keyboard.press('Enter'); // Photos (first row)
  const coverflow = page.getByTestId('coverflow');
  await expect(coverflow).toBeVisible();
  await expect(coverflow).toContainText('1 of 10');
  // Side covers carry a soft dim; the focused one stays bright.
  await expect(coverflow.locator('[data-dimmed]').first()).toBeVisible();
  await expect(
    coverflow.locator('[data-dimmed]', { has: page.getByTestId('focused-cover') }),
  ).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(coverflow).toContainText('3 of 10');
  await page.keyboard.press('Enter');
  await expect(coverflow).toHaveAttribute('data-flipped', 'true');
  await expect(page.getByTestId('cover-back')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(coverflow).not.toHaveAttribute('data-flipped', 'true');
});

test('Misc > List: two groups, each a scrollable list of entries', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Misc
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('Misc');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown'); // List (just below Concerts Seen)
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('List');
  const rows = page.getByTestId('menu-row');
  await expect(rows.nth(0)).toContainText('Americans taking a good thing and ruining it');
  await expect(rows.nth(1)).toContainText('Americans doing things right');
  await page.keyboard.press('Enter'); // open the "ruining it" group
  await expect(page.getByTestId('status-bar')).toContainText('ruining it');
  await expect(rows.first()).toContainText('Garlic ice cream'); // each entry is its own row
  await page.keyboard.press('Escape'); // back to the List menu
  await expect(rows.first()).toContainText('Americans taking a good thing and ruining it');
});

test('Collections: grouped mug list, static photos, and recipes', async ({ page }) => {
  await page.keyboard.press('ArrowDown'); // Collections
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('Collections');
  const rows = page.getByTestId('menu-row');
  for (const [i, label] of ['Mug Collection', 'Vinyls', 'Fridge Magnets', 'Recipes'].entries()) {
    await expect(rows.nth(i)).toContainText(label);
  }
  // Mug Collection: category groups, each opening a list that shows the gifter.
  await page.keyboard.press('Enter'); // Mug Collection (first row)
  await expect(rows.nth(0)).toContainText('States');
  await expect(rows.nth(1)).toContainText('Cities');
  await expect(rows.nth(2)).toContainText('Countries');
  await expect(rows.nth(3)).toContainText('Special');
  await page.keyboard.press('Enter'); // open States
  await expect(rows.filter({ hasText: 'from' }).first()).toBeVisible(); // gifter shown
  await page.keyboard.press('Escape'); // back to the category groups
  await page.keyboard.press('Escape'); // back to the Collections menu
  // Vinyls still opens its static photo.
  await page.keyboard.press('ArrowDown'); // Vinyls
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('Vinyls');
  await expect(page.locator('img[alt="Vinyls"]')).toBeVisible();
  await page.keyboard.press('Escape'); // back to the Collections menu
  await expect(rows.nth(1)).toContainText('Vinyls');
});

test('SoundCloud lists tracks (or the fallback link) as an iPod menu', async ({ page }) => {
  await page.keyboard.press('Enter'); // Music
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown'); // SoundCloud
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('SoundCloud');
  // Live widget tracks, or the seeded fallback row — never a stuck spinner.
  await expect(page.getByTestId('menu-row').first()).toBeVisible({ timeout: 15000 });
});

test('Recommendations: Spotify playlist plays through the native Now Playing card', async ({ page }) => {
  await page.keyboard.press('Enter'); // Music
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown'); // Recommendations
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('Recommendations');
  const rows = page.getByTestId('menu-row');
  // Curated Spotify playlists.
  await expect(rows.nth(0)).toContainText("Today's Top Hits");
  // Open the first Spotify playlist → a native track list.
  await page.keyboard.press('Enter');
  await expect(rows.first()).toBeVisible();
  // Play the first track → the same Now Playing card as SoundCloud, but Spotify.
  await page.keyboard.press('Enter');
  const card = page.getByTestId('now-playing');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Spotify');
  await expect(card).toContainText(/1 of \d+/);
  // The hidden <audio> engine is wired to a keyless preview MP3.
  await expect(page.getByTestId('spotify-audio')).toHaveAttribute('src', /^https?:\/\//);
  // prev/next are transport controls while audio is loaded (real iPod behavior).
  await page.keyboard.press('ArrowRight');
  await expect(card).toContainText(/2 of \d+/);
  // Center press summons the in-card scrubber.
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('data-scrubbing', 'true');
  // MENU dismisses the scrubber first, then backs out — audio element persists.
  await page.keyboard.press('Escape');
  await expect(card).not.toHaveAttribute('data-scrubbing', 'true');
  await page.keyboard.press('Escape');
  await expect(rows.first()).toBeVisible();
  await expect(page.getByTestId('spotify-audio')).toBeAttached();
});

async function playFirstSpotifyTrack(page: import('@playwright/test').Page) {
  const rows = page.getByTestId('menu-row');
  await page.keyboard.press('Enter'); // Music
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown'); // Recommendations
  await page.keyboard.press('Enter'); // open the playlists (loads async)
  await expect(rows.nth(0)).toContainText("Today's Top Hits");
  await page.keyboard.press('Enter'); // open the first playlist
  await expect(rows.first()).toBeVisible();
  await page.keyboard.press('Enter'); // play the first track
  await expect(page.getByTestId('now-playing')).toBeVisible();
}

test('Now Playing: hold-center and the main-menu item jump back to the card', async ({ page }) => {
  await playFirstSpotifyTrack(page);
  const card = page.getByTestId('now-playing');

  // Auto-advance/transport no longer steals focus: from the track list, the
  // hold-center shortcut is how you get back to the card.
  await page.keyboard.press('Escape'); // back to the track list (a menu)
  await expect(page.getByTestId('menu-row').first()).toBeVisible();
  await page.keyboard.down('Enter');
  await page.waitForTimeout(650); // pass the hold threshold
  await page.keyboard.up('Enter');
  await expect(card).toBeVisible();

  // Escape home — a "Now Playing" row now sits at the bottom of the main menu.
  for (let i = 0; i < 6; i++) await page.keyboard.press('Escape');
  await expect(page.getByTestId('status-bar')).toContainText("Dipen's iPod");
  const rows = page.getByTestId('menu-row');
  await expect(rows.first()).toContainText('Music');
  await expect(rows.last()).toContainText('Now Playing');
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown'); // down to it
  await expect(rows.last()).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(card).toBeVisible();
});

test('hold Play/Pause sleeps the screen; any key wakes it, audio keeps playing', async ({ page }) => {
  await playFirstSpotifyTrack(page);
  const overlay = page.getByTestId('sleep-overlay');
  await expect(overlay).not.toHaveAttribute('data-asleep', 'true');

  await page.keyboard.down('Space');
  await page.waitForTimeout(650); // pass the hold threshold
  await page.keyboard.up('Space');
  await expect(overlay).toHaveAttribute('data-asleep', 'true');
  // The hidden audio engine is untouched — music plays on while asleep.
  await expect(page.getByTestId('spotify-audio')).toBeAttached();

  // The first key only wakes the screen (and is otherwise swallowed).
  await page.keyboard.press('ArrowDown');
  await expect(overlay).not.toHaveAttribute('data-asleep', 'true');
});

test('reads an article: scroll with the wheel, View Original links out', async ({ page }) => {
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown'); // Articles
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
  await page.keyboard.press('ArrowDown'); // Professional
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row').first()).toContainText('Software Developer');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('URL Insurance Group');
  await expect(page.getByTestId('reader-content')).toContainText('Took ownership of the commission system');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  // Misc → Links (root selection is still on Professional, three below Misc)
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Links
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row')).toHaveCount(9);
  await expect(page.getByTestId('menu-row').first()).toContainText('LinkedIn');
});

test('theme toggle switches to the black iPod and persists across reload', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'silver');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Misc
  await page.keyboard.press('Enter');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowDown'); // Settings
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row').first()).toContainText('Theme');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'black');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'black');
  await expect(page.getByTestId('ipod')).toBeVisible();
});

test('Misc: kitchen wins flip, concerts by year, wifi names', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Misc
  await page.keyboard.press('Enter');
  // Kitchen Wins coverflow
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const coverflow = page.getByTestId('coverflow');
  await expect(coverflow).toContainText('1 of 10');
  await expect(coverflow).toContainText('Homemade Pizza');
  await page.keyboard.press('Enter'); // flip
  await expect(page.getByTestId('cover-back')).toContainText('Homemade Pizza');
  await page.keyboard.press('Escape'); // unflip
  await page.keyboard.press('Escape'); // back to Misc
  // Concerts Seen: newest year group first, drill straight into it
  await page.keyboard.press('ArrowDown'); // Concerts Seen (just below Kitchen Wins now)
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row').first()).toContainText('2025');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row').first()).toContainText('Buckethead');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  // Wi-Fi names list (selection is on Concerts; Wi-Fi now sits just above Settings)
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown'); // List, pennguytweets, Links, Wi-Fi Names
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu-row').first()).toContainText('Martin Router King');
  await expect(page.getByTestId('menu-row')).toHaveCount(25);
});

test('tweet shuffle setting toggles and the list still renders', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Misc
  await page.keyboard.press('Enter');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowDown'); // Settings
  await page.keyboard.press('Enter');
  const rows = page.getByTestId('menu-row');
  await expect(rows.nth(1)).toContainText('pennguytweets');
  await expect(rows.nth(1)).toContainText('Newest First');
  await page.keyboard.press('ArrowDown'); // the pennguytweets row
  await page.keyboard.press('Enter');
  await expect(rows.nth(1)).toContainText('Shuffled');
  // The shuffled list still serves every tweet (order is random by design).
  await page.keyboard.press('Escape'); // back to Misc, selection on Settings
  await page.keyboard.press('ArrowUp'); // Wi-Fi Names
  await page.keyboard.press('ArrowUp'); // Links
  await page.keyboard.press('ArrowUp'); // pennguytweets
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('pennguytweets');
  await expect(rows.first()).not.toBeEmpty();
});

test('video fullscreen setting toggles and persists across reload', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Misc
  await page.keyboard.press('Enter');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowDown'); // Settings
  await page.keyboard.press('Enter');
  const rows = page.getByTestId('menu-row');
  await expect(rows.nth(2)).toContainText('Video Fullscreen');
  await expect(rows.nth(2)).toContainText('Off');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown'); // the fullscreen row
  await page.keyboard.press('Enter');
  await expect(rows.nth(2)).toContainText('On');
  // Persists via localStorage.
  await page.reload();
  await expect(page.getByTestId('ipod')).toBeVisible();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Misc
  await page.keyboard.press('Enter');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowDown'); // Settings
  await page.keyboard.press('Enter');
  await expect(rows.nth(2)).toContainText('On');
});

test('click sound setting toggles on and off', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Misc
  await page.keyboard.press('Enter');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowDown'); // Settings
  await page.keyboard.press('Enter');
  const rows = page.getByTestId('menu-row');
  await expect(rows.nth(3)).toContainText('Click Sound');
  await expect(rows.nth(3)).toContainText('On');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown'); // the Click Sound row
  await page.keyboard.press('Enter');
  await expect(rows.nth(3)).toContainText('Off');
});

test('About on the home menu shows the contact email', async ({ page }) => {
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown'); // About
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('About');
  await expect(page.getByTestId('reader-content')).toContainText('dipenrgupta@icloud.com');
  await page.keyboard.press('Escape'); // back home
  await expect(page.getByTestId('menu-row').nth(4)).toContainText('About');
});

test('Recipes (now under Collections): category groups open recipe lists and readable details', async ({ page }) => {
  await page.keyboard.press('ArrowDown'); // Collections
  await page.keyboard.press('Enter');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown'); // Recipes (last in Collections)
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('Recipes');
  const rows = page.getByTestId('menu-row');
  // The four category groups, each with a recipe count.
  await expect(rows.nth(0)).toContainText('Food');
  await expect(rows.nth(1)).toContainText('Baking');
  await expect(rows.nth(2)).toContainText('Drinks');
  await expect(rows.nth(3)).toContainText('Tips & Tricks');
  await expect(rows.nth(0)).toContainText(/\d+ recipes/);
  // A full recipe reads in the text reader.
  await page.keyboard.press('Enter'); // Food
  await expect(rows.first()).toContainText('Chicken Rice');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('reader-content')).toContainText('Marinating the chicken');
  await page.keyboard.press('Escape'); // back to the Food list
  await page.keyboard.press('Escape'); // back to the categories
  // A link-backed recipe keeps its View Original footer.
  await page.keyboard.press('ArrowDown'); // Baking
  await page.keyboard.press('Enter');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown'); // Tiramisu
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('reader-content')).toContainText('mascarpone');
  await expect(page.getByTestId('view-original')).toHaveAttribute('href', /tastesbetterfromscratch\.com/);
});

test('pennguytweets: newest-first list opens a tweet with its date', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // Misc
  await page.keyboard.press('Enter');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown'); // pennguytweets
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('status-bar')).toContainText('pennguytweets');
  const rows = page.getByTestId('menu-row');
  // Wait for the tweet rows themselves (the outgoing menu's rows linger
  // during the slide): the 9th row is #702, the newest with a resolved
  // date sublabel — the final few scraped rows have none.
  await expect(rows.nth(8)).toContainText(/\d{4}-\d{2}-\d{2}/);
  // Step down to it and open it.
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowDown');
  await expect(rows.nth(8)).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Enter');
  const content = page.getByTestId('reader-content');
  // Detail shows the "N/x" numbered text plus when it was posted.
  await expect(content).toContainText(/^\s*\d+\/x /);
  await expect(content).toContainText(/Posted: \w{3} \d{1,2}, \d{4}/);
  await expect(page.getByTestId('status-bar')).toContainText('#');
  await expect(page.getByTestId('view-original')).toHaveAttribute('href', /x\.com\/20swithepennguy/);
  await page.keyboard.press('Escape'); // back to the list
  await expect(rows.nth(8)).toContainText(/\d{4}-\d{2}-\d{2}/);
});

test('the iTunes view is reachable and links back to the iPod', async ({ page }) => {
  await page.getByRole('link', { name: /iTunes view/ }).click();
  await expect(page).toHaveURL(/\/itunes/);
  await expect(page.getByTestId('itunes-window')).toBeVisible();
  await page.getByRole('link', { name: "Dipen's iPod" }).click();
  await expect(page.getByTestId('ipod')).toBeVisible();
});
