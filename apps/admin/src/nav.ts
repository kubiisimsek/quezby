import type { AdminRole } from '@quezby/types';
import {
  CalendarDays,
  ChartLine,
  Gamepad2,
  GalleryVerticalEnd,
  LayoutDashboard,
  Medal,
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
  /** What its badge counts. */
  badge?: 'review';
};

/** The panel's one menu. Nothing here links to a page its admin cannot open. */
export const NAV: NavItem[] = [
  { href: '/', label: 'Genel bakış', icon: LayoutDashboard, section: 'Genel' },
  { href: '/analytics', label: 'Analitik', icon: ChartLine, section: 'Genel' },
  { href: '/players', label: 'Oyuncular', icon: Users, section: 'Oyuncular' },
  { href: '/suspects', label: 'Şüpheliler', icon: ShieldAlert, section: 'Oyuncular', badge: 'review' },
  { href: '/runs', label: 'Turlar', icon: Gamepad2, section: 'Oyuncular' },
  { href: '/boards', label: 'Sıralamalar', icon: Trophy, section: 'Oyun' },
  { href: '/daily', label: 'Günün akışı', icon: CalendarDays, section: 'Oyun' },
  { href: '/leagues', label: 'Ligler', icon: Medal, section: 'Oyun' },
  { href: '/content', label: 'İçerik', icon: GalleryVerticalEnd, section: 'Oyun' },
  { href: '/audit', label: 'Denetim kaydı', icon: ScrollText, section: 'Yönetim' },
  { href: '/admins', label: 'Yöneticiler', icon: UserCog, section: 'Yönetim', least: 'owner' },
  { href: '/system', label: 'Sistem', icon: Server, section: 'Yönetim', least: 'owner' },
];

export function navFor(role: AdminRole | null | undefined): NavItem[] {
  return NAV.filter((item) => item.least === undefined || atLeast(role, item.least));
}

/** The entry a path belongs to: the longest href it starts with, so a record keeps its list lit. */
export function activeNavHref(items: NavItem[], pathname: string): string | null {
  const matches = items.filter((item) =>
    item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
