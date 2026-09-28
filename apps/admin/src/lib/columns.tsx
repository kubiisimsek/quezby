import type { AdminAuditEntry, AdminPlayerRef, AdminRunFlag, AdminRunRow, AdminRunStatus, RunFlagCode } from '@quezby/types';
import { Ban, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar } from '@/components/base/avatar';
import { Hint } from '@/components/base/tooltip';
import { Tag } from '@/components/base/tag';
import type { Column } from '@/components/patterns/data-table';
import {
  AUDIT_ACTION,
  AUDIT_VIA,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPerMille,
  formatRelative,
  playerName,
  RUN_FLAG,
  RUN_MODE,
  RUN_STATUS,
  SEVERITY,
  shortId,
} from '@/lib/format';

/**
 * The cells more than one table draws: who a player is, a run's status and
 * signals, a line of the audit log.
 */

/** A player's photo (or initials) and handle; a banned one says so. */
export function PlayerCell({
  player,
  avatarUrl,
  hint,
  link = false,
}: {
  player: AdminPlayerRef | null;
  /** Their photo, where the row carries it. */
  avatarUrl?: string | null;
  hint?: string;
  link?: boolean;
}) {
  if (!player) return <span className="text-ink-faint">Silinmiş oyuncu</span>;
  const name = playerName(player.username);
  const banned = player.bannedAt !== null;

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={player.username} src={avatarUrl} tone={banned ? 'bad' : 'secondary'} size="sm" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          {link ? (
            <Link to={`/players/${player.id}`} className="truncate font-semibold text-ink hover:text-primary-text hover:underline">
              {name}
            </Link>
          ) : (
            <span className="truncate font-semibold text-ink">{name}</span>
          )}
          {banned ? <Tag tone="bad" label="Yasaklı" icon={<Ban />} className="px-1.5 py-0.5" /> : null}
        </span>
        {hint ? <span className="block truncate text-micro font-medium text-ink-faint">{hint}</span> : null}
      </span>
    </span>
  );
}

/** A moment in a table cell: one line, the exact time on hover. */
export function When({ at, as = 'relative' }: { at: string | null | undefined; as?: 'relative' | 'date' | 'dateTime' }) {
  if (!at) return <span className="text-ink-faint">—</span>;
  const text = as === 'relative' ? formatRelative(at) : as === 'date' ? formatDate(at) : formatDateTime(at);
  return (
    <time dateTime={at} title={formatDateTime(at)} className="whitespace-nowrap">
      {text}
    </time>
  );
}

/** A run's status in a word; what it means for the boards on hover. */
export function RunStatusTag({ status }: { status: AdminRunStatus }) {
  const { tone, label, hint } = RUN_STATUS[status];
  return <Tag tone={tone} label={label} title={hint} />;
}

/** A run's signals as tags, the hard ones first; past `max` a count of the rest. */
export function FlagTags({ flags, max = 3 }: { flags: AdminRunFlag[]; max?: number }) {
  if (flags.length === 0) return <span className="text-ink-faint">—</span>;
  const sorted = [...flags].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'hard' ? -1 : 1));
  const shown = sorted.slice(0, max);
  const rest = sorted.length - shown.length;

  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((flag, index) => {
        const words = RUN_FLAG[flag.code];
        return (
          <Hint key={`${flag.code}-${index}`} content={words?.hint ?? flag.code}>
            <span>
              <Tag tone={SEVERITY[flag.severity].tone} label={words?.label ?? flag.code} />
            </span>
          </Hint>
        );
      })}
      {rest > 0 ? <Tag tone="neutral" dot={false} label={`+${rest}`} /> : null}
    </span>
  );
}

/** What an audit line is about, as a link where there is a page for it. */
export function SubjectCell({ entry }: { entry: AdminAuditEntry }) {
  const { type, id, label } = entry.subject;
  if (type === 'player' && id) {
    return (
      <Link to={`/players/${id}`} className="font-semibold text-ink hover:text-primary-text hover:underline">
        {playerName(label)}
      </Link>
    );
  }
  if (type === 'run' && id) {
    return (
      <Link to={`/runs/${id}`} className="font-semibold text-ink hover:text-primary-text hover:underline">
        Tur {shortId(id)}
        {label ? <span className="font-medium text-ink-muted"> · {playerName(label)}</span> : null}
      </Link>
    );
  }
  if (type === 'admin') return <span className="font-semibold text-ink">{label ?? 'Yönetici'}</span>;
  return <span className="text-ink-muted">Sistem</span>;
}

/** The audit log's columns; the address only for an owner. */
export function auditColumns(withIp: boolean): Column<AdminAuditEntry>[] {
  const columns: Column<AdminAuditEntry>[] = [
    {
      key: 'at',
      header: 'Zaman',
      cell: (entry) => <When at={entry.at} />,
      tone: 'muted',
    },
    {
      key: 'actor',
      header: 'Kim',
      cell: (entry) => (
        <span className="flex items-center gap-2.5">
          {entry.via === 'panel' ? (
            <Avatar name={entry.actor.name} tone="primary" size="sm" />
          ) : (
            <span aria-hidden className="grid size-7.5 place-items-center rounded-pill bg-fill text-ink-muted">
              <Terminal className="size-3.5" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{entry.actor.name}</span>
            <span className="block text-micro font-medium text-ink-faint">{AUDIT_VIA[entry.via]}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Ne yaptı',
      cell: (entry) => <Tag tone={AUDIT_ACTION[entry.action].tone} label={AUDIT_ACTION[entry.action].label} />,
    },
    { key: 'subject', header: 'Kime', cell: (entry) => <SubjectCell entry={entry} /> },
    {
      key: 'reason',
      header: 'Sebep',
      cell: (entry) => <span className="line-clamp-2 max-w-72">{entry.reason ?? '—'}</span>,
      tone: 'muted',
      hideBelow: 'lg',
    },
  ];
  if (withIp) {
    columns.push({ key: 'ip', header: 'Adres', cell: (entry) => entry.ip ?? '—', tone: 'mono', hideBelow: 'xl' });
  }
  return columns;
}

/** Every signal as a picker option, in the order the API lists them. */
export const FLAG_OPTIONS = (Object.entries(RUN_FLAG) as [RunFlagCode, { label: string }][]).map(([value, { label }]) => ({ value, label }));

/** A list of runs: which, whose and when, how it ended, what it scored and tripped. */
export const RUN_COLUMNS: Column<AdminRunRow>[] = [
  { key: 'run', header: 'Tur', cell: (run) => shortId(run.id), tone: 'mono', hideBelow: 'xl' },
  {
    key: 'player',
    header: 'Oyuncu',
    cell: (run) => (
      <span title={formatDateTime(run.startedAt)}>
        <PlayerCell player={run.player} hint={`${RUN_MODE[run.mode]} · ${formatRelative(run.startedAt)}`} />
      </span>
    ),
  },
  { key: 'status', header: 'Durum', cell: (run) => <RunStatusTag status={run.status} /> },
  { key: 'score', header: 'Skor', cell: (run) => formatNumber(run.score), align: 'end', tone: 'strong' },
  { key: 'accuracy', header: 'İsabet', cell: (run) => formatPerMille(run.accuracy), align: 'end', tone: 'muted', hideBelow: 'xl' },
  { key: 'flags', header: 'Sinyaller', cell: (run) => <FlagTags flags={run.flags} max={2} />, hideBelow: 'md' },
];
