'use client';

import type { SectionData } from '@/lib/itunes/types';
import styles from './StatusBar.module.css';

function plural(unit: string, n: number): string {
  if (n === 1) return unit;
  if (/[^aeiou]y$/.test(unit)) return `${unit.slice(0, -1)}ies`;
  if (/(s|sh|ch|x)$/.test(unit)) return `${unit}es`;
  return `${unit}s`;
}

/** Item count for the loaded section, e.g. "16 guitars" or "37 songs". */
function summarize(data: SectionData, label: string, unit?: string): string {
  let n: number;
  switch (data.kind) {
    case 'coverflow':
      n = data.items.length;
      break;
    case 'tracks': {
      n = data.groups.reduce((sum, g) => sum + g.rows.length, 0);
      if (unit) {
        const base = `${n} ${plural(unit, n)}`;
        return unit === 'song' && data.groups.length > 1
          ? `${base} in ${data.groups.length} playlists`
          : base;
      }
      return `${n} items`;
    }
    case 'video':
      n = data.groups.reduce((sum, g) => sum + g.videos.length, 0);
      break;
    case 'reading':
      n = data.entries.length;
      break;
    case 'tweets':
      n = data.tweets.length;
      break;
    case 'external':
      n = data.rows.length;
      break;
    case 'search':
      return `${data.total} ${data.total === 1 ? 'result' : 'results'}`;
    default:
      // embed / staticPhoto: no meaningful count — name the section instead.
      return label;
  }
  return `${n} ${unit ? plural(unit, n) : 'item' + (n === 1 ? '' : 's')}`;
}

interface StatusBarProps {
  data: SectionData | null;
  label: string;
  unit?: string;
  loading: boolean;
  showImageSlider?: boolean;
  imageScale?: number;
  onImageScale?: (scale: number) => void;
}

export default function StatusBar({
  data,
  label,
  unit,
  loading,
  showImageSlider,
  imageScale = 1,
  onImageScale,
}: StatusBarProps) {
  const text = loading || !data ? '' : summarize(data, label, unit);
  return (
    <div className={styles.statusBar} data-testid="itunes-statusbar">
      <span className={styles.spacer} />
      <span className={styles.count}>{text}</span>
      <span className={styles.spacer}>
        {showImageSlider && onImageScale && (
          <span className={styles.zoom} data-testid="itunes-imageslider">
            <span className={styles.zoomGlyph} aria-hidden="true">
              ▪
            </span>
            <input
              type="range"
              className={styles.zoomRange}
              min={0.6}
              max={1.6}
              step={0.05}
              value={imageScale}
              onChange={(e) => onImageScale(Number(e.target.value))}
              aria-label="Image size"
            />
            <span className={styles.zoomGlyphLg} aria-hidden="true">
              ◼
            </span>
          </span>
        )}
      </span>
    </div>
  );
}
