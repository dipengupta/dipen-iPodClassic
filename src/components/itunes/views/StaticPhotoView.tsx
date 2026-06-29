import type { StaticPhotoData } from '@/lib/itunes/types';
import styles from './StaticPhotoView.module.css';

export default function StaticPhotoView({ data }: { data: StaticPhotoData }) {
  return (
    <div className={styles.wrap}>
      <figure className={styles.figure}>
        {/* eslint-disable-next-line @next/next/no-img-element -- committed pre-optimized WebP; next/image adds nothing here */}
        <img src={data.imagePath} alt={data.title} className={styles.image} decoding="async" />
        <figcaption className={styles.caption}>
          <h2 className={styles.title}>{data.title}</h2>
          <p className={styles.text}>{data.text}</p>
        </figcaption>
      </figure>
    </div>
  );
}
