/**
 * Static content not in the database. The Octavium/Vinyls/Magnets photos mirror
 * the iPod's menu-tree `payload`s (src/lib/menu/tree.ts) — copied here rather
 * than imported so the iTunes view never pulls in the iPod's menu graph or
 * store (keep those three in sync if the originals change). ABOUT_TEXT is
 * deliberately iTunes-specific (the iPod has its own click-wheel version).
 */

export const ABOUT_TEXT = `Hi, I'm Dipen! Welcome to Dipen's iTunes.

This is the desktop companion to my personal website, which is built as a 1:1 replica of the iPod Classic. Same content, just laid out the iTunes way: pick a section from the source list on the left.

Music has my guitars (browse them in Grid, or flip to Cover Flow with the button up top), my YouTube and Instagram videos, SoundCloud tracks, and a set of Spotify recommendations you can preview right here with the player at the top. There's also Photos, Collections (mugs, vinyls, fridge magnets, recipes), my writing, work history, and a pile of odds and ends.

Songs and previews play through the transport controls at the top; videos play inline. Want the full handheld experience instead? Click "Dipen's iPod" under Devices to switch over to the iPod itself.

Everything in here is real, built with Next.js, SQLite and a lot of CSS!

Want to say hi? I'm at dipenrgupta@icloud.com.

Dipen :)`;

export const OCTAVIUM_TEXT = `Octavium was my college band, where I played the bass. It was quite a ride, from playing in and winning band competitions, to writing original songs, to even performing at the Hard Rock Cafe!`;

export interface StaticPhoto {
  title: string;
  imagePath: string;
  text: string;
}

export const OCTAVIUM_PHOTO: StaticPhoto = {
  title: 'Octavium',
  imagePath: '/images/music/Octavium.webp',
  text: OCTAVIUM_TEXT,
};

export const VINYLS_PHOTO: StaticPhoto = {
  title: 'Vinyls',
  imagePath: '/images/travel/vinyls.webp',
  text: 'The vinyl shelf.',
};

export const MAGNETS_PHOTO: StaticPhoto = {
  title: 'Fridge Magnets',
  imagePath: '/images/travel/fridge-magnets.webp',
  text: 'Magnets from everywhere.',
};
