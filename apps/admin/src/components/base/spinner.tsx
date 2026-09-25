import { cn } from '@/lib/utils';

/** Something is on its way. Takes the colour of the text around it. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Yükleniyor"
      className={cn('inline-block size-4 animate-spin rounded-pill border-2 border-current border-t-transparent opacity-70', className)}
    />
  );
}
