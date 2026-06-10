import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './itunes.module.css';

export const metadata: Metadata = {
  title: 'iTunes — coming soon',
};

/**
 * Stub for the future desktop companion: an iTunes-7-era library UI that
 * will sit alongside the iPod on large screens.
 */
export default function ItunesStub() {
  return (
    <div className={styles.window}>
      <div className={styles.titleBar}>
        <span className={styles.trafficLights} aria-hidden="true">
          <i /><i /><i />
        </span>
        <span className={styles.title}>iTunes</span>
        <span className={styles.trafficSpacer} />
      </div>
      <div className={styles.lcd}>
        <span className={styles.lcdNote}>♫</span>
        <span>Sync in progress… (coming soon)</span>
      </div>
      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <p className={styles.sidebarHeading}>LIBRARY</p>
          <p className={styles.sidebarItem}>♫ Music</p>
          <p className={styles.sidebarItem}>▶ Movies</p>
          <p className={styles.sidebarHeading}>DEVICES</p>
          <p className={`${styles.sidebarItem} ${styles.sidebarSelected}`}>◼ Dipen&apos;s iPod</p>
        </aside>
        <main className={styles.main}>
          <h1>This pane is a stub.</h1>
          <p>
            A full iTunes-style desktop companion is planned here — library browsing,
            the works. For now, the iPod does everything.
          </p>
          <Link className={styles.backLink} href="/">
            ← Back to the iPod
          </Link>
        </main>
      </div>
    </div>
  );
}
