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
    case 'external':
      n = data.rows.length;
      break;
    default:
      // embed / staticPhoto: no meaningful count — name the section instead.
      return label;
  }
  return `${n} ${unit ? plural(unit, n) : 'item' + (n === 1 ? '' : 's')}`;
}

export default function StatusBar({
  data,
  label,
  unit,
  loading,
}: {
  data: SectionData | null;
  label: string;
  unit?: string;
  loading: boolean;
}) {
  const text = loading || !data ? '' : summarize(data, label, unit);
  return (
    <div className={styles.statusBar} data-testid="itunes-statusbar">
      <span className={styles.count}>{text}</span>
    </div>
  );
}
