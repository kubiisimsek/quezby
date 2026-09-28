import type { ContentKind } from '@quezby/config';

import type { ReelLook } from '@/game/content';
import { Chart } from '@/game/formats/Chart';
import { Chat } from '@/game/formats/Chat';
import { Cctv } from '@/game/formats/Cctv';
import { Dump } from '@/game/formats/Dump';
import { Fact } from '@/game/formats/Fact';
import { Notifications } from '@/game/formats/Notifications';
import { Polaroid } from '@/game/formats/Polaroid';
import { Poll } from '@/game/formats/Poll';
import { Quote } from '@/game/formats/Quote';
import { Receipt } from '@/game/formats/Receipt';
import { Scene } from '@/game/formats/Scene';
import { Sign } from '@/game/formats/Sign';
import { Tier } from '@/game/formats/Tier';
import { Treasure } from '@/game/formats/Treasure';

/**
 * A post's picture: its format, drawn in its kind's colours with the parts
 * the dress picked. The badge above it and the caption under it are the
 * reel's (`ReelCard`), the same for every format.
 */
export function PostMedia({ look, kind }: { look: ReelLook; kind: ContentKind }) {
  const { media, dress, emoji } = look;
  switch (media.format) {
    case 'scene':
      return <Scene emoji={emoji} caption={look.caption} kind={kind} dress={dress} />;
    case 'chat':
      return <Chat media={media} />;
    case 'poll':
      return <Poll media={media} />;
    case 'chart':
      return <Chart media={media} emoji={emoji} />;
    case 'receipt':
      return <Receipt media={media} angle={dress.tilt} />;
    case 'fact':
      return <Fact media={media} emoji={emoji} dress={dress} />;
    case 'tier':
      return <Tier media={media} />;
    case 'notifications':
      return <Notifications media={media} />;
    case 'quote':
      return <Quote media={media} user={look.user} dress={dress} />;
    case 'polaroid':
      return <Polaroid media={media} emoji={emoji} dress={dress} />;
    case 'dump':
      return <Dump media={media} dress={dress} />;
    case 'treasure':
      return <Treasure emoji={emoji} dress={dress} />;
    case 'sign':
      return <Sign media={media} emoji={emoji} dress={dress} />;
    case 'cctv':
      return <Cctv media={media} emoji={emoji} dress={dress} />;
  }
}
