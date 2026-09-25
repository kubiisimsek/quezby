import { cn } from '@/lib/utils';

const SIZE = {
  sm: 'size-7 text-meta',
  md: 'size-9 text-heading',
  lg: 'size-14 text-title',
  xl: 'size-24 text-[2.75rem]',
} as const;

/** Quezby's Q on the logo's gradient. */
export function BrandMark({ size = 'md', className }: { size?: keyof typeof SIZE; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 select-none place-items-center rounded-[28%] bg-brand-wash font-bold text-on-brand shadow-brand', SIZE[size], className)}
    >
      Q
    </span>
  );
}
