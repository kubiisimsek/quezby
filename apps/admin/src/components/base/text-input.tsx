import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

import { cn } from '@/lib/utils';

/** The well every field sits in: a soft fill that turns into a lit surface when focused. */
export const WELL =
  'group/well flex w-full items-center gap-2.5 rounded-control border-[1.5px] border-transparent bg-fill px-3.5 transition-[background-color,border-color,box-shadow] duration-150 ease-snap hover:bg-fill-hover focus-within:border-primary focus-within:bg-surface focus-within:ring-4 focus-within:ring-primary/12';

export const WELL_INVALID = 'border-bad-line focus-within:border-bad focus-within:ring-bad/12';

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  icon?: ReactNode;
  /** After the text: a unit, a toggle. */
  trailing?: ReactNode;
  compact?: boolean;
  invalid?: boolean;
  wellClassName?: string;
  ref?: Ref<HTMLInputElement>;
};

export function TextInput({ icon, trailing, compact = false, invalid = false, className, wellClassName, ...props }: TextInputProps) {
  return (
    <div className={cn(WELL, compact ? 'h-9' : 'h-11', invalid && WELL_INVALID, wellClassName)}>
      {icon ? (
        <span aria-hidden className="text-ink-faint transition-colors group-focus-within/well:text-primary-text [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <input
        aria-invalid={invalid || undefined}
        className={cn('h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint', className)}
        {...props}
      />
      {trailing}
    </div>
  );
}
