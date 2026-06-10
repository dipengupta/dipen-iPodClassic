import type { MenuNode } from './types';

const ABOUT_TEXT = `This site is my personal corner of the internet, rebuilt as a 1:1 iPod Classic.

Spin the wheel (or use the arrow keys) to dig through my music, articles, collections and work history — the same way you'd have hunted for an album in 2007.

Built with Next.js, SQLite and an unreasonable amount of CSS. The guitars, mugs and everything else in here are real. The battery icon, sadly, is not.

— Dipen`;

const OCTAVIUM_TEXT = `Octavium was my college band, where I played the bass. It was quite a ride, from playing in and winning band competitions, to writing original songs, to even performing at the Hard Rock Cafe!`;

export const menuTree: MenuNode = {
  id: 'root',
  label: 'iPod',
  view: 'splitMenu',
  children: [
    {
      id: 'music',
      label: 'Music',
      view: 'splitMenu',
      previewImage: '/images/music/0_GuitarRack.jpeg',
      children: [
        {
          id: 'music.guitars',
          label: 'Guitars',
          view: 'coverflow',
          dataSource: 'guitars',
          previewImage: '/images/music/12_Slash_LP.jpeg',
        },
        {
          id: 'music.youtube',
          label: 'YouTube',
          view: 'list',
          dataSource: 'youtube',
          groupBy: 'year',
          previewImage: '/images/music/2024_youtube.png',
        },
        {
          id: 'music.instagram',
          label: 'Instagram',
          view: 'list',
          dataSource: 'reels',
          previewImage: '/images/music/2024_insta.PNG',
        },
        {
          id: 'music.soundcloud',
          label: 'SoundCloud',
          view: 'list',
          dataSource: 'soundcloud',
          previewImage: '/images/music/soundcloud.png',
        },
        {
          id: 'music.octavium',
          label: 'Octavium',
          view: 'photo',
          previewImage: '/images/music/Octavium.jpg',
          payload: {
            title: 'Octavium',
            imagePath: '/images/music/Octavium.jpg',
            text: OCTAVIUM_TEXT,
          },
        },
      ],
    },
    {
      id: 'photos',
      label: 'Photos',
      view: 'coverflow',
      dataSource: 'photos',
      previewImage: '/images/home/main.jpeg',
    },
    {
      id: 'articles',
      label: 'Articles',
      view: 'list',
      dataSource: 'articles',
    },
    {
      id: 'collections',
      label: 'Collections',
      view: 'splitMenu',
      previewImage: '/images/travel/mugs.JPEG',
      children: [
        {
          id: 'collections.places',
          label: 'Places Visited',
          view: 'list',
          dataSource: 'locations',
          groupBy: 'country',
        },
        {
          id: 'collections.mugs',
          label: 'Mug Collection',
          view: 'coverflow',
          dataSource: 'mugs',
          previewImage: '/images/travel/mugs.JPEG',
        },
        {
          id: 'collections.gallery',
          label: 'Vinyls & Magnets',
          view: 'list',
          dataSource: 'gallery',
          previewImage: '/images/travel/vinyls.jpeg',
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
      id: 'extras',
      label: 'Extras',
      view: 'splitMenu',
      children: [
        {
          id: 'extras.about',
          label: 'About',
          view: 'textReader',
          payload: { title: 'About', text: ABOUT_TEXT },
        },
        {
          id: 'extras.links',
          label: 'Links',
          view: 'list',
          dataSource: 'links',
        },
        {
          id: 'extras.tweets',
          label: 'pennguytweets',
          view: 'tweet',
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
