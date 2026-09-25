import type { Ref, TextareaHTMLAttributes } from 'react';

import { WELL, WELL_INVALID } from '@/components/base/text-input';
import { cn } from '@/lib/utils';

/** A few lines of text — a reason, a note. It grows with what is written. */
export function TextArea({
  invalid = false,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <div className={cn(WELL, 'py-2.5', invalid && WELL_INVALID)}>
      <textarea
        aria-invalid={invalid || undefined}
        className={cn(
          'field-sizing-content max-h-80 min-h-24 w-full resize-none bg-transparent text-body text-ink outline-none placeholder:text-ink-faint',
          className,
        )}
        {...props}
      />
    </div>
  );
}
