'use client';

import Link from 'next/link';
import { catalog, SIDEBAR_GROUPS } from '@/lib/itunes/catalog';
import type { CatalogEntry } from '@/lib/itunes/types';
import styles from './Sidebar.module.css';

interface SidebarProps {
  selectedId: string;
  onSelect: (entry: CatalogEntry) => void;
}

export default function Sidebar({ selectedId, onSelect }: SidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Library" data-testid="itunes-sidebar">
      {SIDEBAR_GROUPS.map((group) => {
        const entries = catalog.filter((e) => e.group === group);
        if (entries.length === 0) return null;
        return (
          <div key={group} className={styles.group}>
            <p className={styles.heading}>{group}</p>
            <ul className={styles.list}>
              {entries.map((entry) => (
                <li key={entry.id}>
                  {entry.href ? (
                    <Link className={styles.item} href={entry.href}>
                      <span className={styles.icon} aria-hidden="true">
                        {entry.icon}
                      </span>
                      <span className={styles.label}>{entry.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.item} ${
                        entry.id === selectedId ? styles.selected : ''
                      }`}
                      aria-current={entry.id === selectedId || undefined}
                      onClick={() => onSelect(entry)}
                    >
                      <span className={styles.icon} aria-hidden="true">
                        {entry.icon}
                      </span>
                      <span className={styles.label}>{entry.label}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </aside>
  );
}
