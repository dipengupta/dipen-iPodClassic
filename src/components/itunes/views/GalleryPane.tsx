import type { CoverflowData } from '@/lib/itunes/types';
import type { GalleryMode } from '../Toolbar';
import CoverFlowView from './CoverFlowView';
import GridView from './GridView';
import styles from './GalleryPane.module.css';

/** Image sections. The Grid ⇄ Cover Flow mode is controlled by the toolbar. */
export default function GalleryPane({ data, mode }: { data: CoverflowData; mode: GalleryMode }) {
  return (
    <div className={styles.wrap}>
      {mode === 'coverflow' ? <CoverFlowView items={data.items} /> : <GridView items={data.items} />}
    </div>
  );
}
