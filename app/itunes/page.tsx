import type { Metadata } from 'next';
import ItunesApp from '@/components/itunes/ItunesApp';
import styles from './itunes.module.css';

export const metadata: Metadata = {
  title: "Dipen's iTunes",
};

/**
 * The desktop iTunes companion: a second display layer over the same data the
 * iPod uses (it fetches the shared /api/... routes). The `.page` wrapper here
 * defines the iTunes design tokens + theme tints; ItunesApp is the interactive
 * client tree. Phones are redirected back to the iPod from inside ItunesApp.
 */
export default function ItunesPage() {
  return (
    <div className={styles.page}>
      <ItunesApp />
    </div>
  );
}
