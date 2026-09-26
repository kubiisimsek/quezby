/**
 * The kit: every shape a screen is built from. Each family lives in its own
 * file under `ui/kit/`; this file gathers them so `@/ui/kit` stays the one
 * import a screen needs.
 */
export { Eyebrow, Ribbon, Txt } from '@/ui/kit/text';
export type { TagTone, Tone } from '@/ui/kit/tones';
export {
  Arena,
  BrandBand,
  Card,
  Divider,
  Gradient,
  Panel,
  Screen,
  type PanelTone,
} from '@/ui/kit/surfaces';
export { Slab, type SlabColors } from '@/ui/kit/slab';
export { TopBar } from '@/ui/kit/topbar';
export { Avatar, IconChip, gemColors } from '@/ui/kit/identity';
export {
  Button,
  IconButton,
  SocialButton,
  buttonColors,
  type ButtonTone,
} from '@/ui/kit/buttons';
export { ArrowNub, PlayerRow, Row, SwitchRow, Toggle } from '@/ui/kit/rows';
export {
  Callout,
  Stat,
  StatGrid,
  StatRow,
  Tag,
  type StatItem,
} from '@/ui/kit/status';
export { Field, PasswordField } from '@/ui/kit/fields';
export { EmptyState, Loading, Skeleton, SkeletonList } from '@/ui/kit/loading';
export { Segmented } from '@/ui/kit/segmented';
export { Meter } from '@/ui/kit/meter';
export { MedalBadge, TierBadge, type MedalRank } from '@/ui/kit/badges';
export { CountdownChip } from '@/ui/kit/countdown';
export { Podium, Spotlight, type PodiumEntry } from '@/ui/kit/podium';
export { ClimbRow, FloorCard } from '@/ui/kit/climb';
export { BonusChip, ShareGrid } from '@/ui/kit/result';
export { LobbyCard, PlayButton, RankChips } from '@/ui/kit/lobby';
export { CoachCard, type CoachGesture } from '@/ui/kit/coach';
export { ConsentCard } from '@/ui/kit/consent';
export { Confetti, CountUp, Stamp, useShake } from '@/ui/kit/juice';
export { SPRING_POP, stagger } from '@/ui/motion';
