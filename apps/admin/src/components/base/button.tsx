import { Slot, Slottable } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import { Spinner } from '@/components/base/spinner';
import { cn } from '@/lib/utils';

export type ButtonTone = 'primary' | 'secondary' | 'neutral' | 'ghost' | 'danger' | 'onBrand' | 'onBrandSoft';

/**
 * The emphasis ladder: one solid `primary` per view (on the band it is the
 * white `onBrand`), a soft violet `secondary`, the filled `neutral`, the bare
 * `ghost`, and `danger` for what cannot be taken back.
 */
const TONE: Record<ButtonTone, string> = {
  primary: 'bg-primary text-primary-ink shadow-primary hover:bg-primary-hover active:bg-primary-hover',
  secondary:
    'border border-secondary-line bg-secondary-soft text-secondary-text hover:bg-secondary-soft-hover active:bg-secondary-soft-active',
  neutral: 'bg-fill text-ink hover:bg-fill-hover active:bg-fill-active',
  ghost: 'text-ink-muted hover:bg-fill hover:text-ink active:bg-fill-hover',
  danger: 'border border-bad-line bg-bad-soft text-bad-text hover:border-bad hover:bg-bad hover:text-ink-on-solid',
  onBrand: 'bg-on-brand text-brand-from shadow-brand hover:bg-on-brand/90 focus-visible:outline-on-brand',
  onBrandSoft:
    'border border-on-brand/30 bg-on-brand/12 text-on-brand hover:bg-on-brand/20 active:bg-on-brand/26 focus-visible:outline-on-brand',
};

const SIZE = {
  sm: 'h-8 gap-1.5 px-3 text-meta [&_svg]:size-3.5',
  md: 'h-9.5 gap-2 px-4 text-body [&_svg]:size-4',
  lg: 'h-11.5 gap-2 px-5 text-heading [&_svg]:size-4.5',
  icon: 'size-9.5 [&_svg]:size-4.5',
  'icon-sm': 'size-8 [&_svg]:size-4',
} as const;

/** From which width a label shows beside its icon; below it the button is the icon alone. */
const LABEL_FROM = {
  md: 'max-md:sr-only',
  lg: 'max-lg:sr-only',
  xl: 'max-xl:sr-only',
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: keyof typeof SIZE;
  icon?: ReactNode;
  /** A spinner takes the icon's place; the label stays. */
  loading?: boolean;
  /** Render the one child (a router `Link`) with the button's look. `labelFrom` needs a real button. */
  asChild?: boolean;
  labelFrom?: keyof typeof LABEL_FROM;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  tone = 'neutral',
  size = 'md',
  icon,
  loading = false,
  asChild = false,
  labelFrom,
  className,
  children,
  disabled,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  const glyph = loading ? <Spinner className="size-[1em]" /> : icon;

  return (
    <Component
      type={asChild ? undefined : (type ?? 'button')}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-control font-semibold transition-[background-color,border-color,color,box-shadow,scale] duration-150 ease-snap active:scale-97 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:shrink-0',
        TONE[tone],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {glyph}
      {labelFrom && !asChild ? (
        <Slottable>
          <span className={LABEL_FROM[labelFrom]}>{children}</span>
        </Slottable>
      ) : (
        <Slottable>{children}</Slottable>
      )}
    </Component>
  );
}
