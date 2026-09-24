import type { Theme } from '@/ui/theme';

export type Tone =
  | 'ink'
  | 'muted'
  | 'faint'
  | 'primary'
  | 'secondary'
  | 'ok'
  | 'warn'
  | 'bad'
  | 'onSolid';

/** The colour a text `Tone` names. */
export function toneColor(theme: Theme, tone: Tone): string {
  switch (tone) {
    case 'muted':
      return theme.inkMuted;
    case 'faint':
      return theme.inkFaint;
    case 'primary':
      return theme.primaryText;
    case 'secondary':
      return theme.secondaryText;
    case 'ok':
      return theme.okText;
    case 'warn':
      return theme.warnText;
    case 'bad':
      return theme.badText;
    case 'onSolid':
      return theme.inkOnSolid;
    default:
      return theme.ink;
  }
}

export type TagTone =
  'neutral' | 'primary' | 'secondary' | 'ok' | 'warn' | 'bad';

/** Fill, glyph and border for a status tone — tags, chips, avatars. */
export function tagPalette(
  theme: Theme,
): Record<TagTone, { bg: string; fg: string; border: string }> {
  return {
    neutral: { bg: theme.fill, fg: theme.inkMuted, border: theme.line },
    primary: {
      bg: theme.primarySoft,
      fg: theme.primaryText,
      border: theme.primaryLine,
    },
    secondary: {
      bg: theme.secondarySoft,
      fg: theme.secondaryText,
      border: theme.secondaryLine,
    },
    ok: { bg: theme.okSoft, fg: theme.okText, border: theme.okLine },
    warn: { bg: theme.warnSoft, fg: theme.warnText, border: theme.warnLine },
    bad: { bg: theme.badSoft, fg: theme.badText, border: theme.badLine },
  };
}
