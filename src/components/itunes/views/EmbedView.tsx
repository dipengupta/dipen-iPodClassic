import type { EmbedData } from '@/lib/itunes/types';
import styles from './EmbedView.module.css';

/** A third-party widget (SoundCloud) — plays itself, fully isolated. */
export default function EmbedView({ data }: { data: EmbedData }) {
  return (
    <div className={styles.wrap}>
      <iframe
        className={styles.frame}
        src={data.src}
        title={data.title}
        allow="autoplay"
        scrolling="no"
      />
    </div>
  );
}
