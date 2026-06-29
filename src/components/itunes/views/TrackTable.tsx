'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AudioTrack, PlaybackSource, TrackRow, TracksData } from '@/lib/itunes/types';
import styles from './TrackTable.module.css';

interface TrackTableProps {
  data: TracksData;
  /** id of the AudioTrack currently loaded in the player, for highlighting. */
  currentTrackId?: string;
  playing: boolean;
  onPlay: (queue: AudioTrack[], index: number, source: PlaybackSource) => void;
  onTogglePlay: () => void;
}

export default function TrackTable({ data, currentTrackId, playing, onPlay, onTogglePlay }: TrackTableProps) {
  const { columns, groups, queue } = data;
  const source: PlaybackSource = data.source ?? 'spotify';
  const hasSecondary = Boolean(columns.secondary);
  const hasTime = Boolean(columns.time);

  const allRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const firstSelectable = (rows: TrackRow[]) => {
    const p = rows.findIndex((r) => r.playIndex != null);
    return p >= 0 ? p : 0;
  };
  const [selId, setSelId] = useState<string | undefined>(allRows[firstSelectable(allRows)]?.id);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reset selection + take keyboard focus when the section changes.
  useEffect(() => {
    setSelId(allRows[firstSelectable(allRows)]?.id);
    wrapRef.current?.focus();
  }, [allRows]);

  const activate = (row?: TrackRow) => {
    if (!row) return;
    if (row.playIndex != null && queue) onPlay(queue, row.playIndex, source);
    else if (row.href) window.open(row.href, '_blank', 'noopener,noreferrer');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (allRows.length === 0) return;
    const idx = Math.max(0, allRows.findIndex((r) => r.id === selId));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelId(allRows[Math.min(allRows.length - 1, idx + 1)].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelId(allRows[Math.max(0, idx - 1)].id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(allRows[idx]);
    } else if (e.key === ' ') {
      e.preventDefault();
      onTogglePlay();
    }
  };

  return (
    <div className={styles.wrap} ref={wrapRef} tabIndex={0} onKeyDown={onKeyDown} data-testid="itunes-tracktable">
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
              source={source}
              currentTrackId={currentTrackId}
              selectedId={selId}
              playing={playing}
              onSelect={setSelId}
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
  source,
  currentTrackId,
  selectedId,
  playing,
  onSelect,
  onPlay,
}: {
  heading?: string;
  rows: TrackRow[];
  colSpan: number;
  hasSecondary: boolean;
  hasTime: boolean;
  queue?: AudioTrack[];
  source: PlaybackSource;
  currentTrackId?: string;
  selectedId?: string;
  playing: boolean;
  onSelect: (id: string) => void;
  onPlay: (queue: AudioTrack[], index: number, source: PlaybackSource) => void;
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
        const isSelected = row.id === selectedId;
        const playable = Boolean(track);
        const onActivate = () => {
          if (track && queue) onPlay(queue, row.playIndex!, source);
          else if (row.href) window.open(row.href, '_blank', 'noopener,noreferrer');
        };
        return (
          <tr
            key={row.id}
            className={`${styles.row} ${isCurrent ? styles.current : isSelected ? styles.selectedRow : ''} ${
              playable || row.href ? styles.actionable : ''
            }`}
            onClick={() => onSelect(row.id)}
            onDoubleClick={onActivate}
          >
            <td className={styles.numCol}>
              {playable ? (
                <button
                  type="button"
                  className={styles.playBtn}
                  aria-label={isCurrent && playing ? 'Pause' : `Play ${row.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onActivate();
                  }}
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
