'use client';

import type { Frame } from '@/lib/store/ipodStore';
import MenuRows from './MenuRows';

const BODY_HEIGHT = 220;

export default function ListView({ frame }: { frame: Frame }) {
  return (
    <MenuRows
      items={frame.items}
      selectedIndex={frame.selectedIndex}
      height={BODY_HEIGHT}
    />
  );
}
