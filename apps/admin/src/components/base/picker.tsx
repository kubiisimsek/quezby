import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { WELL } from '@/components/base/text-input';
import { cn } from '@/lib/utils';

export type PickerOption<T extends string> = { value: T; label: ReactNode; icon?: ReactNode; hint?: ReactNode };

/**
 * One choice out of a list, in the same well as a text field. The chosen
 * option is bold and wears a small magenta disc.
 */
export function Picker<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Seç',
  compact = false,
  id,
  'aria-label': ariaLabel,
  className,
  disabled,
}: {
  value: T | undefined;
  onChange: (value: T) => void;
  options: PickerOption<T>[];
  placeholder?: string;
  compact?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select.Root value={value} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
      <Select.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          WELL,
          'justify-between text-start text-body text-ink outline-none data-[placeholder]:text-ink-faint data-[state=open]:border-primary data-[state=open]:bg-surface',
          compact ? 'h-9 w-auto min-w-40' : 'h-11',
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate [&_svg]:size-4 [&_svg]:text-ink-faint">
          <Select.Value placeholder={placeholder} />
        </span>
        <Select.Icon asChild>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-faint transition-transform duration-200 ease-snap group-data-[state=open]/well:rotate-180" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-panel bg-overlay p-1.5 shadow-raised data-[state=open]:animate-menu-in"
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-control py-2 pl-3 pr-9 text-body text-ink outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-fill data-[state=checked]:font-semibold data-[state=checked]:text-primary-text [&_svg]:size-4"
              >
                {option.icon}
                <Select.ItemText>{option.label}</Select.ItemText>
                {option.hint ? <span className="ml-auto text-micro font-medium text-ink-faint">{option.hint}</span> : null}
                <Select.ItemIndicator className="absolute right-2 grid size-5 place-items-center rounded-pill bg-primary text-primary-ink">
                  <Check className="size-3 stroke-[3]" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
