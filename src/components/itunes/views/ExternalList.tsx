import type { ExternalData } from '@/lib/itunes/types';
import styles from './ExternalList.module.css';

export default function ExternalList({ data }: { data: ExternalData }) {
  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {data.rows.map((row) => (
          <li key={row.id}>
            <a className={styles.row} href={row.href} target="_blank" rel="noopener noreferrer">
              <span className={styles.label}>{row.label}</span>
              {row.sublabel && <span className={styles.sub}>{row.sublabel}</span>}
              <span className={styles.go} aria-hidden="true">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
