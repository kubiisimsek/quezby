import { Eye, EyeOff } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { TextInput, type TextInputProps } from '@/components/base/text-input';
import { cn } from '@/lib/utils';

type ControlProps = { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean };

/**
 * A labelled control: the label above, a hint or the error below. The
 * control comes from `children(props)` so any input, picker or text area
 * can stand in a field and still be named by its label.
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <div className={cn('flex items-baseline gap-1 text-micro text-ink-faint', error && 'text-bad-text')}>
        <label htmlFor={id}>{label}</label>
        {required ? (
          <span aria-hidden className="text-bad-text">
            *
          </span>
        ) : null}
      </div>
      {children({ id, 'aria-describedby': note ? noteId : undefined, 'aria-invalid': error ? true : undefined })}
      {note ? (
        <p id={noteId} role={error ? 'alert' : undefined} className={cn('text-meta', error ? 'text-bad-text' : 'text-ink-faint')}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** A labelled text input. */
export function TextField({
  label,
  hint,
  error,
  required,
  className,
  ...input
}: TextInputProps & { label: ReactNode; hint?: ReactNode; error?: string | null }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(control) => <TextInput {...input} {...control} required={required} invalid={Boolean(error)} />}
    </Field>
  );
}

/** A labelled password, with the eye that shows what was typed. */
export function PasswordField({
  label,
  hint,
  error,
  required,
  className,
  ...input
}: Omit<TextInputProps, 'type' | 'trailing'> & { label: ReactNode; hint?: ReactNode; error?: string | null }) {
  const [shown, setShown] = useState(false);

  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(control) => (
        <TextInput
          {...input}
          {...control}
          type={shown ? 'text' : 'password'}
          required={required}
          invalid={Boolean(error)}
          trailing={
            <button
              type="button"
              onClick={() => setShown((value) => !value)}
              aria-label={shown ? 'Şifreyi gizle' : 'Şifreyi göster'}
              aria-pressed={shown}
              className="-mr-1.5 grid size-8 place-items-center rounded-pill text-ink-faint transition-colors hover:bg-fill-hover hover:text-ink [&_svg]:size-4"
            >
              {shown ? <EyeOff /> : <Eye />}
            </button>
          }
        />
      )}
    </Field>
  );
}
