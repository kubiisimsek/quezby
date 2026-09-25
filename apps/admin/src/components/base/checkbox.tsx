import { Check } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A native checkbox dressed as the panel's: the tick pops in when it is chosen. */
export function Checkbox({
  label,
  hint,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={cn('flex items-start gap-3 text-body text-ink', className)}>
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          type="checkbox"
          className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[6px] border-[1.5px] border-line-strong bg-surface transition-colors checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          {...props}
        />
        <Check
          aria-hidden
          className="pointer-events-none relative size-3.5 scale-0 stroke-[3] text-primary-ink transition-transform duration-300 ease-pop peer-checked:scale-100"
        />
      </span>
      <span className="grid gap-0.5">
        <span className="font-semibold">{label}</span>
        {hint ? <span className="text-meta text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
