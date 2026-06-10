'use client';

import { useIpodStore } from '@/lib/store/ipodStore';
import styles from './StatusBar.module.css';

export default function StatusBar() {
  const title = useIpodStore((s) => s.stack[s.stack.length - 1].title);
  return (
    <div className={styles.bar} data-testid="status-bar">
      <span className={styles.side} />
      <span className={styles.title}>{title}</span>
      <span className={styles.side}>
        <svg viewBox="0 0 22 11" width="20" height="10" aria-hidden="true">
          <rect x="0.5" y="0.5" width="18" height="10" rx="2" fill="none" stroke="#555" />
          <rect x="20" y="3" width="2" height="5" rx="1" fill="#555" />
          <rect x="2" y="2" width="13" height="7" rx="1" fill="#7ac143" />
        </svg>
      </span>
    </div>
  );
}
