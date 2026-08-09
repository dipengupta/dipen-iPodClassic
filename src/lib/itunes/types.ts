/**
 * iTunes view-model types. The desktop iTunes view is a separate display layer
 * over the same data the iPod uses — it fetches the shared `/api/...` routes and
 * maps rows into these shapes. Nothing here is imported by the iPod.
 */

/** Which main-pane component renders a sidebar entry's content. */
export type ViewKind =
  | 'coverflow' // image gallery with a Grid toggle
  | 'tracks' // song/list table (spotify previews, soundcloud, plain grouped lists)
  | 'video' // YouTube + local UGG videos
  | 'reading' // text entries (articles/recipes/timeline/about)
  | 'tweets' // Twitter-style pennguytweets feed
  | 'staticPhoto' // single photo + blurb (octavium/vinyls/magnets)
  | 'external'; // link-out rows

export type SidebarGroup =
  | 'MUSIC'
  | 'PLAYLISTS'
  | 'PHOTOS'
  | 'COLLECTIONS'
  | 'WRITING'
  | 'ABOUT'
  | 'ODDS & ENDS'
  | 'DEVICES';

/** One sidebar row. `loader` names the loaders.ts function; `href` is a device link. */
export interface CatalogEntry {
  id: string;
  label: string;
  icon: string;
  group: SidebarGroup;
  view: ViewKind;
  loader?: LoaderKey;
  href?: string;
  /** Singular noun for the status-bar count ("16 guitars"). Defaults to "item". */
  unit?: string;
}

export type LoaderKey =
  | 'articles'
  | 'guitars'
  | 'photos'
  | 'soundcloud'
  | 'mugs'
  | 'vinyls'
  | 'magnets'
  | 'recipes'
  | 'kitchen'
  | 'alison'
  | 'concerts'
  | 'list'
  | 'tweets'
  | 'wifi'
  | 'links'
  | 'professional'
  | 'octavium'
  | 'about'
  | 'youtube'
  | 'instagram';

// --- Cover Flow -------------------------------------------------------------

export interface CoverItem {
  id: string;
  label: string;
  sublabel?: string;
  imagePath?: string;
  /** Back-of-cover text shown on flip. */
  flipText?: string;
}

export interface CoverflowData {
  kind: 'coverflow';
  items: CoverItem[];
}

// --- Track table ------------------------------------------------------------

/** Playback source for a tracks queue. Spotify uses the <audio> 30s previews;
 *  SoundCloud uses the hidden iTunes SoundCloud widget. */
export type PlaybackSource = 'spotify' | 'soundcloud';

/** One playable track. Spotify rows carry `audioSrc`; SoundCloud rows `scIndex`. */
export interface AudioTrack {
  id: string;
  title: string;
  audioSrc?: string;
  /** SoundCloud widget index (source === 'soundcloud'). */
  scIndex?: number;
}

export interface TrackRow {
  id: string;
  name: string;
  secondary?: string;
  time?: string;
  /** Index into the section's `queue`, if this row plays audio. */
  playIndex?: number;
  /** External target, if this row links out instead of playing. */
  href?: string;
}

export interface TrackGroup {
  heading?: string;
  rows: TrackRow[];
}

export interface TracksData {
  kind: 'tracks';
  columns: { name: string; secondary?: string; time?: string };
  groups: TrackGroup[];
  /** Shared audio queue; rows reference it by `playIndex`. */
  queue?: AudioTrack[];
  /** Which player the queue uses (defaults to spotify). */
  source?: PlaybackSource;
}

// --- Video ------------------------------------------------------------------

export interface VideoEntry {
  id: string;
  title: string;
  sublabel?: string;
  source: 'youtube' | 'ugg';
  /** YouTube video id (source === 'youtube'). */
  youtubeId?: string;
  /** Local stream URL /api/video/... (source === 'ugg'). */
  videoSrc?: string;
  caption?: string;
}

export interface VideoGroup {
  heading: string;
  videos: VideoEntry[];
}

export interface VideoData {
  kind: 'video';
  groups: VideoGroup[];
}

// --- Reading ----------------------------------------------------------------

export interface ReadingEntry {
  id: string;
  title: string;
  subtitle?: string;
  /** Group heading; consecutive entries sharing one render under a header. */
  heading?: string;
  /** Inline body (recipes/timeline/tweets/about). */
  text?: string;
  /** Slug to lazily fetch bodyHtml from /api/articles/[slug] on open. */
  articleSlug?: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

export interface ReadingData {
  kind: 'reading';
  entries: ReadingEntry[];
}

// --- Tweets -----------------------------------------------------------------

export interface TweetCard {
  id: string;
  number: number | null;
  text: string;
  date?: string;
  url?: string;
}

export interface TweetsData {
  kind: 'tweets';
  handle: string;
  displayName: string;
  tweets: TweetCard[];
}

// --- Static photo / external / embed ---------------------------------------

export interface StaticPhotoData {
  kind: 'staticPhoto';
  title: string;
  imagePath: string;
  text: string;
}

export interface ExternalRow {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export interface ExternalData {
  kind: 'external';
  rows: ExternalRow[];
}

// --- Search -----------------------------------------------------------------

export interface SearchResultItem {
  /** focusId — the destination view's item id (see loaders.ts id schemes). */
  id: string;
  /** Catalog entry to open when this result is clicked. */
  entryId: string;
  title: string;
  snippet?: string;
}

export interface SearchResultGroup {
  type: string;
  label: string;
  results: SearchResultItem[];
}

export interface SearchData {
  kind: 'search';
  query: string;
  total: number;
  groups: SearchResultGroup[];
}

export type SectionData =
  | CoverflowData
  | TracksData
  | VideoData
  | ReadingData
  | TweetsData
  | StaticPhotoData
  | ExternalData
  | SearchData;

/** Sidebar metadata for one Recommendations playlist (dynamic PLAYLISTS group). */
export interface Playlist {
  id: number;
  title: string;
  service: 'spotify' | 'apple';
  playlistUrl: string;
}
