'use client';

import type { AudioTrack, TracksData } from '@/lib/itunes/types';
import styles from './TrackTable.module.css';

interface TrackTableProps {
  data: TracksData;
  /** id of the AudioTrack currently loaded in the player, for highlighting. */
  currentTrackId?: string;
  playing: boolean;
  onPlay: (queue: AudioTrack[], index: number) => void;
}

export default function TrackTable({ data, currentTrackId, playing, onPlay }: TrackTableProps) {
  const { columns, groups, queue } = data;
  const hasSecondary = Boolean(columns.secondary);
  const hasTime = Boolean(columns.time);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.numCol} aria-label="Track number" />
            <th className={styles.nameCol}>{columns.name}</th>
            {hasSecondary && <th className={styles.secCol}>{columns.secondary}</th>}
            {hasTime && <th className={styles.timeCol}>{columns.time}</th>}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => (
            <GroupRows
              key={group.heading ?? `g${gi}`}
              heading={group.heading}
              rows={group.rows}
              colSpan={2 + (hasSecondary ? 1 : 0) + (hasTime ? 1 : 0)}
              hasSecondary={hasSecondary}
              hasTime={hasTime}
              queue={queue}
              currentTrackId={currentTrackId}
              playing={playing}
              onPlay={onPlay}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({
  heading,
  rows,
  colSpan,
  hasSecondary,
  hasTime,
  queue,
  currentTrackId,
  playing,
  onPlay,
}: {
  heading?: string;
  rows: TracksData['groups'][number]['rows'];
  colSpan: number;
  hasSecondary: boolean;
  hasTime: boolean;
  queue?: AudioTrack[];
  currentTrackId?: string;
  playing: boolean;
  onPlay: (queue: AudioTrack[], index: number) => void;
}) {
  return (
    <>
      {heading && (
        <tr className={styles.groupRow}>
          <td className={styles.groupHeading} colSpan={colSpan}>
            {heading}
          </td>
        </tr>
      )}
      {rows.map((row, i) => {
        const track = row.playIndex != null && queue ? queue[row.playIndex] : undefined;
        const isCurrent = Boolean(track && track.id === currentTrackId);
        const playable = Boolean(track);
        const onActivate = () => {
          if (track && queue) onPlay(queue, row.playIndex!);
          else if (row.href) window.open(row.href, '_blank', 'noopener,noreferrer');
        };
        return (
          <tr
            key={row.id}
            className={`${styles.row} ${isCurrent ? styles.current : ''} ${
              playable || row.href ? styles.actionable : ''
            }`}
            onDoubleClick={onActivate}
          >
            <td className={styles.numCol}>
              {playable ? (
                <button
                  type="button"
                  className={styles.playBtn}
                  aria-label={isCurrent && playing ? 'Pause' : `Play ${row.name}`}
                  onClick={onActivate}
                >
                  {isCurrent && playing ? '❚❚' : '▶'}
                </button>
              ) : (
                <span className={styles.num}>{i + 1}</span>
              )}
            </td>
            <td className={styles.nameCol}>
              {row.href ? (
                <a className={styles.link} href={row.href} target="_blank" rel="noopener noreferrer">
                  {row.name}
                </a>
              ) : (
                row.name
              )}
            </td>
            {hasSecondary && <td className={styles.secCol}>{row.secondary}</td>}
            {hasTime && <td className={styles.timeCol}>{row.time}</td>}
          </tr>
        );
      })}
    </>
  );
}
