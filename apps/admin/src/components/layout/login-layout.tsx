import { Scale, ShieldCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { BrandMark } from '@/components/base/brand-mark';
import { IconChip } from '@/components/base/icon-chip';
import { cn } from '@/lib/utils';

/** The four moves of the game, floating over the brand half like posts going by. */
const MOVES = [
  { label: 'Yukarı kaydır', className: 'left-[12%] top-[18%]', delay: '0ms' },
  { label: 'Çift dokun', className: 'right-[10%] top-[30%]', delay: '900ms' },
  { label: 'Basılı tut', className: 'left-[16%] bottom-[30%]', delay: '1800ms' },
  { label: 'Dokunma!', className: 'right-[16%] bottom-[18%]', delay: '2700ms' },
];

const POINTS = [
  { icon: <ShieldCheck />, text: 'Şüpheli turları incele, hileyi tablolardan uzak tut.' },
  { icon: <Users />, text: 'Oyuncuları bul, gerektiğinde yasakla ya da adını sıfırla.' },
  { icon: <Scale />, text: 'Her işlem kimin yaptığıyla birlikte kayda geçer.' },
];

/**
 * The sign-in page: the game's gradient on one half, the form on the other.
 * On a narrow screen only the form is left.
 */
export function LoginLayout({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-wash p-10 text-on-brand lg:flex lg:flex-col lg:justify-between xl:p-12">
        <div aria-hidden className="absolute -left-24 -top-24 size-96 rounded-pill bg-on-brand/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -right-16 size-[28rem] rounded-pill bg-brand-to/60 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <BrandMark className="shadow-none ring-1 ring-on-brand/40" />
          <span className="text-title">Quezby</span>
        </div>

        <div aria-hidden className="relative mx-auto grid size-72 place-items-center">
          {[0, 900, 1800].map((delay) => (
            <span key={delay} className="absolute size-40 animate-wave rounded-overlay border border-on-brand/40" style={{ animationDelay: `${delay}ms` }} />
          ))}
          <span className="grid size-40 place-items-center rounded-overlay border border-on-brand/30 bg-on-brand/14 shadow-brand backdrop-blur-md">
            <BrandMark size="xl" className="shadow-none" />
          </span>
          {MOVES.map((move) => (
            <span
              key={move.label}
              className={cn(
                'absolute animate-bob whitespace-nowrap rounded-pill bg-on-brand py-1.5 pl-1.5 pr-3.5 text-meta font-bold text-brand-from shadow-brand',
                move.className,
              )}
              style={{ animationDelay: move.delay }}
            >
              <span className="mr-2 inline-block size-5 rounded-pill bg-brand-wash align-middle" />
              {move.label}
            </span>
          ))}
        </div>

        <div className="relative max-w-lg space-y-5">
          <div>
            <p className="text-title text-on-brand/85">Quezby yönetim paneli</p>
            <p className="mt-1 text-hero">Oyunu adil tut.</p>
          </div>
          <ul className="space-y-3">
            {POINTS.map((point) => (
              <li key={point.text} className="flex items-center gap-3 text-body text-on-brand/90">
                <IconChip icon={point.icon} tone="onBrand" size="sm" />
                {point.text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <span className="text-title text-ink">Quezby Yönetim</span>
          </div>
          <h1 className="text-display text-ink">{title}</h1>
          {description ? <p className="mt-1.5 text-meta text-ink-muted">{description}</p> : null}
          <div className="mt-6 rounded-overlay bg-raised p-6 shadow-card">{children}</div>
        </div>
      </main>
    </div>
  );
}
