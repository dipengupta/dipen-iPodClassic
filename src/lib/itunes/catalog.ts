/**
 * The iTunes sidebar — the single source of truth for what appears in the
 * source list and which loader + view each entry uses. `Sidebar.tsx` renders
 * this array; `ItunesApp` loads `entry.loader` and renders `entry.view`.
 *
 * Entries are organised into themed sections (each item appears once), with
 * DEVICES holding the link back to the iPod.
 */

import type { CatalogEntry } from './types';

export const catalog: CatalogEntry[] = [
  // --- MUSIC ---------------------------------------------------------------
  { id: 'mus-guitars', label: 'Guitars', icon: '🎸', group: 'MUSIC', view: 'coverflow', loader: 'guitars', unit: 'guitar' },
  { id: 'mus-youtube', label: 'YouTube', icon: '📺', group: 'MUSIC', view: 'video', loader: 'youtube', unit: 'video' },
  { id: 'mus-instagram', label: 'Instagram', icon: '📸', group: 'MUSIC', view: 'video', loader: 'instagram', unit: 'episode' },
  { id: 'mus-soundcloud', label: 'SoundCloud', icon: '🎧', group: 'MUSIC', view: 'tracks', loader: 'soundcloud', unit: 'song' },
  { id: 'mus-octavium', label: 'Octavium', icon: '🎵', group: 'MUSIC', view: 'staticPhoto', loader: 'octavium' },

  // --- PLAYLISTS (rows added dynamically from the Recommendations feed) -----

  // --- PHOTOS --------------------------------------------------------------
  { id: 'pho-photos', label: 'Photos', icon: '📷', group: 'PHOTOS', view: 'coverflow', loader: 'photos', unit: 'photo' },
  { id: 'pho-kitchen', label: 'Kitchen Wins', icon: '🍽', group: 'PHOTOS', view: 'coverflow', loader: 'kitchen', unit: 'dish' },

  // --- COLLECTIONS ---------------------------------------------------------
  { id: 'col-mugs', label: 'Mug Collection', icon: '☕', group: 'COLLECTIONS', view: 'tracks', loader: 'mugs', unit: 'mug' },
  { id: 'col-vinyls', label: 'Vinyls', icon: '💿', group: 'COLLECTIONS', view: 'staticPhoto', loader: 'vinyls' },
  { id: 'col-magnets', label: 'Fridge Magnets', icon: '🧲', group: 'COLLECTIONS', view: 'staticPhoto', loader: 'magnets' },
  { id: 'col-recipes', label: 'Recipes', icon: '🍳', group: 'COLLECTIONS', view: 'reading', loader: 'recipes', unit: 'recipe' },
  { id: 'col-alison', label: 'Alison', icon: '🌳', group: 'COLLECTIONS', view: 'coverflow', loader: 'alison', unit: 'photo' },

  // --- WRITING -------------------------------------------------------------
  { id: 'wri-articles', label: 'Articles', icon: '📖', group: 'WRITING', view: 'reading', loader: 'articles', unit: 'article' },
  { id: 'wri-tweets', label: 'pennguytweets', icon: '🐧', group: 'WRITING', view: 'tweets', loader: 'tweets', unit: 'tweet' },

  // --- ABOUT ---------------------------------------------------------------
  { id: 'abt-professional', label: 'Professional', icon: '💼', group: 'ABOUT', view: 'reading', loader: 'professional', unit: 'role' },
  { id: 'abt-about', label: 'About', icon: 'ℹ️', group: 'ABOUT', view: 'reading', loader: 'about' },

  // --- ODDS & ENDS ---------------------------------------------------------
  { id: 'odd-concerts', label: 'Concerts Seen', icon: '🎤', group: 'ODDS & ENDS', view: 'tracks', loader: 'concerts', unit: 'show' },
  { id: 'odd-list', label: 'List', icon: '📝', group: 'ODDS & ENDS', view: 'tracks', loader: 'list', unit: 'entry' },
  { id: 'odd-wifi', label: 'Amusing Wi-Fi Names', icon: '📶', group: 'ODDS & ENDS', view: 'tracks', loader: 'wifi', unit: 'network' },
  { id: 'odd-links', label: 'Links', icon: '🔗', group: 'ODDS & ENDS', view: 'external', loader: 'links', unit: 'link' },

  // --- DEVICES -------------------------------------------------------------
  { id: 'dev-ipod', label: "Dipen's iPod", icon: '◼', group: 'DEVICES', view: 'external', href: '/' },
];

export const SIDEBAR_GROUPS: Array<CatalogEntry['group']> = [
  'MUSIC',
  'PHOTOS',
  'COLLECTIONS',
  'WRITING',
  'ABOUT',
  'PLAYLISTS',
  'ODDS & ENDS',
  'DEVICES',
];

/** The first content entry, selected on load (lands on a Grid gallery). */
export const DEFAULT_ENTRY_ID = 'mus-guitars';

export function entryById(id: string): CatalogEntry | undefined {
  return catalog.find((e) => e.id === id);
}
