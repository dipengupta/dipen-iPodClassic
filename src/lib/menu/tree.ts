import type { MenuNode } from './types';

const ABOUT_TEXT = `Hi, I'm Dipen. This is my personal website, built as a 1:1 replica of the iPod Classic.

New to one of these? Spin the click wheel (or use your arrow keys) to move up and down. Press the center button (or Enter) to open whatever's highlighted, and press Menu (the top of the wheel, or Esc/Backspace) to go back. That's the whole thing.

So go explore: my music and guitars, articles I've written, my work history, recipes, photos, and a pile of other odds and ends under Misc. Poke around, there's more in here than it looks.

Everything in here is real, built with Next.js, SQLite and a lot of CSS!

Want to say hi? I'm at dipenrgupta@icloud.com.

Dipen :)`;

const OCTAVIUM_TEXT = `Octavium was my college band, where I played the bass. It was quite a ride, from playing in and winning band competitions, to writing original songs, to even performing at the Hard Rock Cafe!`;

export const menuTree: MenuNode = {
  id: 'root',
  label: "Dipen's iPod",
  view: 'splitMenu',
  children: [
    {
      id: 'music',
      label: 'Music',
      view: 'splitMenu',
      previewImage: '/images/music/0_GuitarRack.webp',
      children: [
        {
          id: 'music.guitars',
          label: 'Guitars',
          view: 'coverflow',
          dataSource: 'guitars',
          previewImage: '/images/music/12_Slash_LP.webp',
        },
        {
          id: 'music.youtube',
          label: 'YouTube',
          view: 'list',
          dataSource: 'youtube',
          groupBy: 'year',
          previewImage: '/images/music/2024_youtube.webp',
        },
        {
          id: 'music.instagram',
          label: 'Instagram',
          view: 'list',
          dataSource: 'ugg',
          previewImage: '/images/music/2024_insta.webp',
        },
        {
          id: 'music.soundcloud',
          label: 'SoundCloud',
          view: 'list',
          dataSource: 'soundcloud',
          previewImage: '/images/music/soundcloud.webp',
        },
        {
          id: 'music.recommendations',
          label: 'Recommendations',
          view: 'list',
          dataSource: 'recommendations',
          previewImage: '/images/music/soundcloud.webp',
        },
        {
          id: 'music.octavium',
          label: 'Octavium',
          view: 'photo',
          previewImage: '/images/music/Octavium.webp',
          payload: {
            title: 'Octavium',
            imagePath: '/images/music/Octavium.webp',
            text: OCTAVIUM_TEXT,
          },
        },
      ],
    },
    {
      id: 'collections',
      label: 'Collections',
      view: 'splitMenu',
      previewImage: '/images/travel/mugs.webp',
      children: [
        {
          id: 'collections.mugs',
          label: 'Mug Collection',
          view: 'coverflow',
          dataSource: 'mugs',
          previewImage: '/images/travel/mugs.webp',
        },
        {
          id: 'collections.vinyls',
          label: 'Vinyls',
          view: 'photo',
          previewImage: '/images/travel/vinyls.webp',
          payload: {
            title: 'Vinyls',
            imagePath: '/images/travel/vinyls.webp',
            text: 'The vinyl shelf.',
          },
        },
        {
          id: 'collections.travelMugs',
          label: 'Travel Mugs',
          view: 'photo',
          previewImage: '/images/travel/mugs.webp',
          payload: {
            title: 'Travel Mugs',
            imagePath: '/images/travel/mugs.webp',
            text: 'The mug wall.',
          },
        },
        {
          id: 'collections.magnets',
          label: 'Fridge Magnets',
          view: 'photo',
          previewImage: '/images/travel/fridge-magnets.webp',
          payload: {
            title: 'Fridge Magnets',
            imagePath: '/images/travel/fridge-magnets.webp',
            text: 'Magnets from everywhere.',
          },
        },
      ],
    },
    {
      id: 'professional',
      label: 'Professional',
      view: 'list',
      dataSource: 'timeline',
    },
    {
      id: 'articles',
      label: 'Articles',
      view: 'list',
      dataSource: 'articles',
    },
    {
      id: 'about',
      label: 'About',
      view: 'textReader',
      payload: { title: 'About', text: ABOUT_TEXT },
    },
    {
      id: 'extras',
      label: 'Misc',
      view: 'splitMenu',
      children: [
        {
          id: 'extras.photos',
          label: 'Photos',
          view: 'coverflow',
          dataSource: 'photos',
          previewImage: '/images/home/main.webp',
        },
        {
          id: 'extras.kitchen',
          label: 'Kitchen Wins',
          view: 'coverflow',
          dataSource: 'kitchen',
          previewImage: '/images/contact/pizza.webp',
        },
        {
          id: 'extras.recipes',
          label: 'Recipes',
          view: 'list',
          dataSource: 'recipes',
        },
        {
          id: 'extras.concerts',
          label: 'Concerts',
          view: 'list',
          dataSource: 'concerts',
          groupBy: 'year',
        },
        {
          id: 'extras.list',
          label: 'List',
          view: 'list',
          dataSource: 'list',
        },
        {
          id: 'extras.tweets',
          label: 'pennguytweets',
          view: 'list',
          dataSource: 'tweets',
        },
        {
          id: 'extras.links',
          label: 'Links',
          view: 'list',
          dataSource: 'links',
        },
        {
          id: 'extras.wifi',
          label: 'Wi-Fi Names',
          view: 'list',
          dataSource: 'wifi',
        },
        {
          id: 'extras.settings',
          label: 'Settings',
          view: 'settings',
        },
      ],
    },
  ],
};

const index = new Map<string, MenuNode>();
function walk(node: MenuNode) {
  index.set(node.id, node);
  node.children?.forEach(walk);
}
walk(menuTree);

export function findNode(id: string): MenuNode | undefined {
  return index.get(id);
}

export function allNodes(): MenuNode[] {
  return [...index.values()];
}
