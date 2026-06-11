export type ViewType =
  | 'splitMenu'
  | 'list'
  | 'coverflow'
  | 'textReader'
  | 'video'
  | 'nowPlaying'
  | 'photo'
  | 'settings';

export type DataSourceKey =
  | 'articles'
  | 'youtube'
  | 'guitars'
  | 'ugg'
  | 'soundcloud'
  | 'mugs'
  | 'photos'
  | 'kitchen'
  | 'recipes'
  | 'concerts'
  | 'wifi'
  | 'timeline'
  | 'links'
  | 'tweets';

export interface MenuNode {
  id: string;
  label: string;
  /** How the screen renders once this node is opened. */
  view: ViewType;
  /** Static submenu entries (menus only). */
  children?: MenuNode[];
  /** Dynamic items loaded from /api — see dataSources.ts. */
  dataSource?: DataSourceKey;
  /** Insert an auto-generated grouping level (e.g. videos by year). */
  groupBy?: 'year' | 'country';
  /** Image shown in the split-menu preview pane when this entry is highlighted. */
  previewImage?: string;
  /** Static payload for leaf views (textReader/photo). */
  payload?: DetailPayload;
}

/** What a frame of detail content renders. */
export interface DetailPayload {
  title?: string;
  html?: string;
  text?: string;
  imagePath?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  publishedLabel?: string;
  videoId?: string;
  /** Local video URL (/api/video/...) — UGG Chronicles episodes. */
  videoSrc?: string;
  /** Instagram caption shown in the wheel-scrollable overlay. */
  caption?: string;
  /** TextReaderView lazily fetches the body for this slug. */
  articleSlug?: string;
}

/** One selectable row/cover inside a frame. */
export interface FrameItem {
  id: string;
  label: string;
  sublabel?: string;
  imagePath?: string;
  /** Back-of-cover text for coverflow flip. */
  flipText?: string;
  onSelect?: SelectSpec;
}

/** One entry in a playback queue: a YouTube/local video or a SoundCloud track. */
export interface PlayTrack {
  /** videoId for YouTube; widget index for SoundCloud; episode no. for ugg. */
  id: string;
  title: string;
  description?: string;
  date?: string;
  /** Local video URL (ugg only). */
  videoSrc?: string;
  /** Caption overlay text (ugg only). */
  caption?: string;
}

export type PlaybackSource = 'youtube' | 'soundcloud' | 'ugg';

export type SelectSpec =
  | { kind: 'node'; node: MenuNode }
  | { kind: 'items'; title: string; view: ViewType; items: FrameItem[] }
  | { kind: 'detail'; view: ViewType; payload: DetailPayload }
  | { kind: 'external'; href: string }
  | { kind: 'action'; action: 'toggleTheme' }
  | { kind: 'play'; source: PlaybackSource; index: number; queue: PlayTrack[] };
