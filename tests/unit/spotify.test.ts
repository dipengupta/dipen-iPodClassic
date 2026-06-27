import { describe, expect, it } from 'vitest';
import {
  embedUrl,
  parseSpotifyTracks,
  playlistIdFromUrl,
} from '@/lib/fetchers/spotify';

function embedHtml(trackList: unknown): string {
  const payload = JSON.stringify({
    props: { pageProps: { state: { data: { entity: { trackList } } } } },
  });
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${payload}</script></body></html>`;
}

describe('playlistIdFromUrl', () => {
  it('extracts the id from an open.spotify.com URL (with query)', () => {
    expect(playlistIdFromUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc')).toBe(
      '37i9dQZF1DXcBWIGoYBM5M',
    );
  });

  it('extracts the id from a spotify: URI', () => {
    expect(playlistIdFromUrl('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')).toBe('37i9dQZF1DXcBWIGoYBM5M');
  });

  it('returns null for non-playlist URLs', () => {
    expect(playlistIdFromUrl('https://music.apple.com/us/playlist/foo/pl.123')).toBeNull();
  });
});

describe('embedUrl', () => {
  it('builds the keyless embed page URL', () => {
    expect(embedUrl('abc123')).toBe('https://open.spotify.com/embed/playlist/abc123');
  });
});

describe('parseSpotifyTracks', () => {
  it('maps playable tracks with a preview to {uri,title,artist,previewUrl}', () => {
    const html = embedHtml([
      {
        uri: 'spotify:track:1',
        title: 'Song A',
        subtitle: 'Artist A',
        audioPreview: { url: 'https://p.scdn.co/mp3-preview/a' },
      },
    ]);
    expect(parseSpotifyTracks(html)).toEqual([
      { trackUri: 'spotify:track:1', title: 'Song A', artist: 'Artist A', previewUrl: 'https://p.scdn.co/mp3-preview/a' },
    ]);
  });

  it('drops tracks without a preview MP3 so every listed row plays', () => {
    const html = embedHtml([
      { uri: 'spotify:track:1', title: 'No preview', subtitle: 'X' },
      { uri: 'spotify:track:2', title: 'Has preview', subtitle: 'Y', audioPreview: { url: 'https://p.scdn.co/mp3-preview/b' } },
    ]);
    const tracks = parseSpotifyTracks(html);
    expect(tracks.map((t) => t.title)).toEqual(['Has preview']);
  });

  it('returns [] when the embed blob is missing or malformed', () => {
    expect(parseSpotifyTracks('<html>no next data</html>')).toEqual([]);
    expect(parseSpotifyTracks('<script id="__NEXT_DATA__">not json</script>')).toEqual([]);
  });
});
