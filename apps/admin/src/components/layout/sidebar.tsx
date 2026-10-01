import type { AdminMe } from '@quezby/types';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Avatar } from '@/components/base/avatar';
import { BrandMark } from '@/components/base/brand-mark';
import { Button } from '@/components/base/button';
import { Menu } from '@/components/base/menu';
import { Segmented } from '@/components/base/segmented';
import { useSlidingThumb } from '@/hooks/useSlidingThumb';
import { ADMIN_ROLE, formatNumber } from '@/lib/format';
import { PANEL_VERSION } from '@/lib/release';
import { cn } from '@/lib/utils';
import { activeNavHref, NAV_SECTIONS, type NavItem, type NavSection } from '@/nav';
import { useTheme, type Theme } from '@/providers/theme-provider';

export const COLLAPSE_KEY = 'quezby.admin.nav.collapsed';
export const CLOSED_KEY = 'quezby.admin.nav.closed';

function readClosed(): NavSection[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((section): section is NavSection => NAV_SECTIONS.includes(section as NavSection)) : [];
  } catch {
    return [];
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* remembered for this visit only */
  }
}

/**
 * The panel's only chrome. A soft magenta pill springs to the page you are
 * on; the groups fold away and this browser remembers which; the account,
 * the theme and signing out live at its foot — which is what lets every
 * page open on its own brand band instead of under a second bar.
 */
export function Sidebar({
  items,
  admin,
  badges = {},
  onSignOut,
  onNavigate,
  showClose = false,
}: {
  items: NavItem[];
  admin: AdminMe;
  /** What waits behind an entry, by its href. */
  badges?: Record<string, number>;
  onSignOut: () => void;
  /** After a link is followed — closes the drawer on a small screen. */
  onNavigate?: () => void;
  /** The drawer's copy: always open, with a close button. */
  showClose?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [stored, setStored] = useState(readCollapsed);
  const collapsed = stored && !showClose;
  useEffect(() => remember(COLLAPSE_KEY, stored ? '1' : '0'), [stored]);

  const activeHref = activeNavHref(items, location.pathname);
  const activeSection = items.find((item) => item.href === activeHref)?.section ?? null;

  const [closed, setClosed] = useState<NavSection[]>(readClosed);
  const folded = (section: NavSection) => !collapsed && closed.includes(section);
  useEffect(() => remember(CLOSED_KEY, JSON.stringify(closed)), [closed]);

  // Landing on a page inside a folded group opens it: a menu that hides where you are is lying.
  useEffect(() => {
    if (!activeSection) return;
    setClosed((current) => (current.includes(activeSection) ? current.filter((name) => name !== activeSection) : current));
  }, [activeSection]);

  const list = useRef<HTMLDivElement>(null);
  const pill = useSlidingThumb(list, '[aria-current="page"]', `${location.pathname}|${collapsed}|${items.length}|${closed.join()}`);

  const sections = NAV_SECTIONS.map((section) => ({ section, entries: items.filter((item) => item.section === section) })).filter(
    (group) => group.entries.length > 0,
  );

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        'flex h-full flex-col border-r border-line bg-surface transition-[width] duration-520 ease-spring',
        collapsed ? 'w-19' : 'w-66',
      )}
    >
      <div className={cn('flex h-18 shrink-0 items-center gap-3 px-4', collapsed && 'justify-center px-0')}>
        <Link to="/" onClick={onNavigate} className="group/brand flex min-w-0 items-center gap-3 rounded-control" aria-label="Quezby Yönetim">
          <BrandMark className="transition-[rotate,scale] duration-520 ease-pop group-hover/brand:-rotate-6 group-hover/brand:scale-105" />
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-title leading-tight text-ink">Quezby</span>
              <span className="block truncate text-micro text-ink-faint">Yönetim paneli</span>
            </span>
          ) : null}
        </Link>
        {showClose ? (
          <Button tone="ghost" size="icon-sm" className="ml-auto rounded-pill bg-fill lg:hidden" aria-label="Menüyü kapat" onClick={onNavigate}>
            <X />
          </Button>
        ) : null}
      </div>

      <nav aria-label="Ana menü" className="flex-1 overflow-y-auto px-3 pb-4">
        <div ref={list} className="relative">
          {pill && !(activeSection && folded(activeSection)) ? (
            <span
              aria-hidden
              className={cn('absolute left-0 top-0 rounded-nav bg-primary-soft', pill.animate && 'transition-[translate,width,height] duration-520 ease-spring')}
              style={{ translate: `${pill.x}px ${pill.y}px`, width: pill.width, height: pill.height }}
            />
          ) : null}

          {sections.map(({ section, entries }, index) => (
            <NavGroup
              key={section}
              section={section}
              first={index === 0}
              collapsed={collapsed}
              folded={folded(section)}
              waiting={entries.reduce((total, item) => total + (badges[item.href] ?? 0), 0)}
              onToggle={() =>
                setClosed((current) => (current.includes(section) ? current.filter((name) => name !== section) : [...current, section]))
              }
            >
              <div className="space-y-0.5">
                {entries.map((item) => {
                  const active = item.href === activeHref;
                  const Icon = item.icon;
                  const badge = badges[item.href] ?? 0;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? (badge > 0 ? `${item.label}, ${badge} bekleyen` : item.label) : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group/nav relative flex h-10.5 items-center gap-3 rounded-nav px-3 text-body font-semibold transition-colors duration-150 ease-snap',
                        active ? 'text-primary-text' : 'text-ink-muted hover:bg-fill hover:text-ink',
                        collapsed && 'justify-center px-0',
                      )}
                    >
                      <Icon
                        aria-hidden
                        className={cn(
                          'size-4.5 shrink-0 transition-[scale,translate] duration-520 ease-pop',
                          active ? 'scale-110 stroke-[2.3]' : 'group-hover/nav:-translate-y-px',
                        )}
                      />
                      {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      {badge > 0 ? (
                        collapsed ? (
                          <span aria-hidden className="absolute right-4 top-2 size-2 rounded-pill bg-primary ring-2 ring-surface" />
                        ) : (
                          <span className="ml-auto grid h-5 min-w-5 animate-pop place-items-center rounded-pill bg-primary px-1.5 text-micro text-primary-ink tabular">
                            {badge > 99 ? '99+' : formatNumber(badge)}
                            <span className="sr-only"> bekleyen</span>
                          </span>
                        )
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </NavGroup>
          ))}
        </div>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line p-3">
        <Menu
          side="top"
          align="start"
          label="Hesap"
          header={
            <div className="flex items-center gap-3">
              <Avatar name={admin.name} size="lg" tone="primary" />
              <div className="min-w-0">
                <p className="truncate text-heading text-ink">{admin.name}</p>
                <p className="truncate text-meta text-ink-muted">{admin.email}</p>
              </div>
            </div>
          }
          items={[
            { label: 'Hesabım', hint: 'Şifreni değiştir', icon: <UserRound />, onSelect: () => navigate('/account') },
            'separator',
            { label: 'Çıkış yap', hint: 'Bu tarayıcıdaki oturum kapanır', icon: <LogOut />, onSelect: onSignOut, tone: 'danger' },
          ]}
          trigger={
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-3 rounded-nav p-2 text-start transition-colors hover:bg-fill data-[state=open]:bg-fill',
                collapsed && 'justify-center',
              )}
              aria-label={`Hesap: ${admin.name}`}
            >
              <Avatar name={admin.name} tone="primary" />
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-meta font-bold text-ink">{admin.name}</span>
                    <span className="block truncate text-micro font-medium text-ink-faint">{ADMIN_ROLE[admin.role].label}</span>
                  </span>
                  <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-ink-faint" />
                </>
              ) : null}
            </button>
          }
        />

        <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between')}>
          {!collapsed ? (
            <Segmented<Theme>
              kind="choice"
              aria-label="Tema"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', label: null, icon: <Sun />, 'aria-label': 'Açık tema' },
                { value: 'dark', label: null, icon: <Moon />, 'aria-label': 'Koyu tema' },
                { value: 'system', label: null, icon: <Monitor />, 'aria-label': 'Sistemin teması' },
              ]}
            />
          ) : null}
          {!showClose ? (
            <Button
              tone="ghost"
              size="icon-sm"
              aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
              onClick={() => setStored((value) => !value)}
            >
              {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
            </Button>
          ) : null}
        </div>
        {!collapsed ? <p className="px-1 text-micro font-medium text-ink-faint tabular-nums">Sürüm {PANEL_VERSION || 'yerel'}</p> : null}
      </div>
    </aside>
  );
}

function NavGroup({
  section,
  first,
  collapsed,
  folded,
  waiting,
  onToggle,
  children,
}: {
  section: NavSection;
  first: boolean;
  collapsed: boolean;
  folded: boolean;
  waiting: number;
  onToggle: () => void;
  children: ReactNode;
}) {
  if (collapsed) {
    return (
      <div className={cn(!first && 'mt-4')}>
        {!first ? <div aria-hidden className="mx-auto mb-4 h-px w-6 bg-line" /> : null}
        {children}
      </div>
    );
  }

  const bodyId = `nav-${section}`;
  return (
    <div className={cn(!first && 'mt-4')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!folded}
        aria-controls={bodyId}
        className="mb-1 flex w-full items-center gap-1.5 rounded-nav px-3 py-1 text-micro text-ink-faint transition-colors hover:text-ink"
      >
        {section}
        {folded && waiting > 0 ? (
          <span className="rounded-pill bg-primary-soft px-1.5 text-primary-text tabular">{formatNumber(waiting)}</span>
        ) : null}
        <ChevronDown aria-hidden className={cn('ml-auto size-3.5 transition-transform duration-520 ease-spring', folded && '-rotate-90')} />
      </button>
      <div
        id={bodyId}
        inert={folded}
        className={cn('grid transition-[grid-template-rows] duration-520 ease-spring', folded ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
