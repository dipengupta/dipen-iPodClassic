/**
 * iTunes view-model types. The desktop iTunes view is a separate display layer
 * over the same data the iPod uses — it fetches the shared `/api/...` routes and
 * maps rows into these shapes. Nothing here is imported by the iPod.
 */

/** Which main-pane component renders a sidebar entry's content. */
export type ViewKind =
  | 'coverflow' // image gallery with a Grid toggle
  | 'tracks' // song/list table (spotify previews + plain grouped lists)
  | 'video' // YouTube + local UGG videos
  | 'reading' // text entries (articles/recipes/timeline/tweets/about)
  | 'staticPhoto' // single photo + blurb (octavium/vinyls/magnets)
  | 'external' // link-out rows
  | 'embed'; // a third-party widget iframe (SoundCloud)

export type SidebarGroup =
  | 'MUSIC'
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
  | 'recommendations'
  | 'soundcloud'
  | 'mugs'
  | 'vinyls'
  | 'magnets'
  | 'recipes'
  | 'kitchen'
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

/** A playable 30s preview (Spotify) streamed by the iTunes toolbar player. */
export interface AudioTrack {
  id: string;
  title: string;
  audioSrc: string;
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

export interface EmbedData {
  kind: 'embed';
  title: string;
  src: string;
}

export type SectionData =
  | CoverflowData
  | TracksData
  | VideoData
  | ReadingData
  | StaticPhotoData
  | ExternalData
  | EmbedData;
