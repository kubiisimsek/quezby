import type { AdminCounts, AdminRole } from '@quezby/types';
import {
  BellRing,
  CalendarDays,
  ChartLine,
  Flag,
  Gamepad2,
  GalleryVerticalEnd,
  Gauge,
  LayoutDashboard,
  Logs,
  ScrollText,
  Server,
  ShieldAlert,
  Trophy,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { atLeast } from '@/lib/permissions';

export type NavSection = 'Genel' | 'Oyuncular' | 'Oyun' | 'Yönetim';

export const NAV_SECTIONS: NavSection[] = ['Genel', 'Oyuncular', 'Oyun', 'Yönetim'];

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section: NavSection;
  /** The least role that sees it; everyone when left out. */
  least?: AdminRole;
  /** What its badge counts, from `GET /counts`. */
  badge?: keyof AdminCounts;
};

/** The panel's one menu. Nothing here links to a page its admin cannot open. */
export const NAV: NavItem[] = [
  { href: '/', label: 'Genel bakış', icon: LayoutDashboard, section: 'Genel' },
  { href: '/analytics', label: 'Analitik', icon: ChartLine, section: 'Genel' },
  { href: '/players', label: 'Oyuncular', icon: Users, section: 'Oyuncular' },
  { href: '/suspects', label: 'Şüpheliler', icon: ShieldAlert, section: 'Oyuncular', badge: 'review' },
  { href: '/reports', label: 'Bildirimler', icon: Flag, section: 'Oyuncular', badge: 'reports' },
  { href: '/runs', label: 'Turlar', icon: Gamepad2, section: 'Oyuncular' },
  { href: '/push', label: 'Push bildirimi', icon: BellRing, section: 'Oyuncular', least: 'owner' },
  { href: '/boards', label: 'Sıralamalar', icon: Trophy, section: 'Oyun' },
  { href: '/daily', label: 'Günün akışı', icon: CalendarDays, section: 'Oyun' },
  { href: '/ratings', label: 'Reytingler', icon: Gauge, section: 'Oyun' },
  { href: '/content', label: 'İçerik', icon: GalleryVerticalEnd, section: 'Oyun' },
  { href: '/audit', label: 'Denetim kaydı', icon: ScrollText, section: 'Yönetim' },
  { href: '/logs', label: 'Loglar', icon: Logs, section: 'Yönetim', least: 'moderator' },
  { href: '/admins', label: 'Yöneticiler', icon: UserCog, section: 'Yönetim', least: 'owner' },
  { href: '/system', label: 'Sistem', icon: Server, section: 'Yönetim', least: 'owner' },
];

export function navFor(role: AdminRole | null | undefined): NavItem[] {
  return NAV.filter((item) => item.least === undefined || atLeast(role, item.least));
}

/** What waits behind each entry that counts something, by its href — nothing until the counts arrive. */
export function navBadges(items: NavItem[], counts: AdminCounts | undefined): Record<string, number> {
  return Object.fromEntries(items.flatMap((item) => (item.badge ? [[item.href, counts?.[item.badge] ?? 0]] : [])));
}

/** The entry a path belongs to: the longest href it starts with, so a record keeps its list lit. */
export function activeNavHref(items: NavItem[], pathname: string): string | null {
  const matches = items.filter((item) =>
    item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
