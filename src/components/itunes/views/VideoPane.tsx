'use client';

import { useEffect, useState } from 'react';
import type { VideoData, VideoEntry } from '@/lib/itunes/types';
import styles from './VideoPane.module.css';

interface VideoPaneProps {
  data: VideoData;
  /** Called when a video starts, so the host can pause any audio playback. */
  onPlay?: () => void;
}

export default function VideoPane({ data, onPlay }: VideoPaneProps) {
  const all = data.groups.flatMap((g) => g.videos);
  const [selectedId, setSelectedId] = useState<string | undefined>(all[0]?.id);

  useEffect(() => {
    setSelectedId(data.groups[0]?.videos[0]?.id);
  }, [data]);

  const selected = all.find((v) => v.id === selectedId);

  const select = (v: VideoEntry) => {
    setSelectedId(v.id);
    onPlay?.();
  };

  return (
    <div className={styles.wrap}>
      <nav className={styles.list} aria-label="Videos">
        {data.groups.map((group) => (
          <div key={group.heading} className={styles.group}>
            <p className={styles.groupHeading}>{group.heading}</p>
            {group.videos.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`${styles.item} ${v.id === selectedId ? styles.selected : ''}`}
                aria-current={v.id === selectedId || undefined}
                onClick={() => select(v)}
              >
                <span className={styles.itemTitle}>{v.title}</span>
                {v.sublabel && <span className={styles.itemSub}>{v.sublabel}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className={styles.stage}>
        {selected ? <Player video={selected} /> : <p className={styles.empty}>No videos.</p>}
      </div>
    </div>
  );
}

function Player({ video }: { video: VideoEntry }) {
  return (
    <div className={styles.player}>
      <div className={styles.frame}>
        {video.source === 'youtube' ? (
          <iframe
            key={video.id}
            className={styles.media}
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- captions shown in the panel below
          <video key={video.id} className={styles.media} src={video.videoSrc} controls autoPlay playsInline />
        )}
      </div>
      <h2 className={styles.playerTitle}>{video.title}</h2>
      {video.caption && <p className={styles.caption}>{video.caption}</p>}
    </div>
  );
}
