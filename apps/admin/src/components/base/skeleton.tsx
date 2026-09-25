import { cn } from '@/lib/utils';

/** The shape of something still loading, breathing until it arrives. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block animate-breathe rounded-control bg-fill', className)} />;
}
