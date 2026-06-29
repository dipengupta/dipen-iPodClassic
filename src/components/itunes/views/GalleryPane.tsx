import type { CoverflowData } from '@/lib/itunes/types';
import type { GalleryMode } from '../Toolbar';
import CoverFlowView from './CoverFlowView';
import GridView from './GridView';
import styles from './GalleryPane.module.css';

/** Image sections. Mode + image scale are controlled by the toolbar/status bar. */
export default function GalleryPane({
  data,
  mode,
  scale,
}: {
  data: CoverflowData;
  mode: GalleryMode;
  scale: number;
}) {
  return (
    <div className={styles.wrap}>
      {mode === 'coverflow' ? (
        <CoverFlowView items={data.items} scale={scale} />
      ) : (
        <GridView items={data.items} scale={scale} />
      )}
    </div>
  );
}
