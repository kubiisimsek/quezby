import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

/**
 * Every route body. The page opens on the brand band — its title, its one
 * action and what it has to say about itself (`band`) — and the canvas rises
 * over the band's foot. Once the title scrolls away a slim bar slides down
 * with the title and the actions, so neither is ever out of reach.
 *
 * `Page` owns the width, the band and the rhythm between blocks: no page sets
 * its own max width or `space-y`. Tabs go on the canvas (`tabs`), where a
 * Segmented reads as one; on the band they would be two whites apart.
 */
export function Page({
  title,
  description,
  eyebrow,
  leading,
  actions,
  back,
  band,
  tabs,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** A small pill above the title — a date, a kind of record. */
  eyebrow?: ReactNode;
  /** A record's picture beside its title — a player's photo. */
  leading?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  /** What the page says about itself, under the title on the band. */
  band?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
}) {
  const marker = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const node = marker.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setCondensed(entry ? !entry.isIntersecting : false));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-full">
      <div className="sticky top-0 z-30 h-0">
        <div
          aria-hidden={!condensed}
          inert={!condensed}
          data-shown={condensed || undefined}
          className="invisible absolute inset-x-0 top-0 -translate-y-full bg-brand-from/95 text-on-brand backdrop-blur-md transition-[translate,visibility] duration-520 ease-spring data-shown:visible data-shown:translate-y-0 data-shown:shadow-brand"
        >
          <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-4 lg:px-8">
            {back ? <BackLink {...back} compact /> : null}
            <p className="min-w-0 flex-1 truncate text-heading">{title}</p>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        </div>
      </div>

      <header className="relative overflow-hidden bg-brand-band text-on-brand">
        <BandArt />
        <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-14 pt-6 lg:px-8 lg:pt-8">
          {back ? <BackLink {...back} /> : null}

          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="flex min-w-0 animate-rise items-center gap-4">
              {leading ? <div className="shrink-0">{leading}</div> : null}
              <div className="min-w-0">
                {eyebrow ? <div className="mb-2.5 flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
                <h1 className="break-words text-display">{title}</h1>
                {description ? <p className="mt-1.5 max-w-xl text-meta text-on-brand/90">{description}</p> : null}
              </div>
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
          </div>

          <div ref={marker} aria-hidden className="h-px" />

          {band ? <div className="mt-5 animate-rise">{band}</div> : null}
        </div>
      </header>

      <div className="relative -mt-7 rounded-t-overlay bg-canvas">
        <div className="mx-auto w-full max-w-[1440px] animate-rise space-y-6 px-4 pb-16 pt-6 lg:px-8 lg:pt-8">
          {tabs ? <div className="-mx-4 overflow-x-auto px-4 lg:-mx-8 lg:px-8">{tabs}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

function BackLink({ to, label, compact = false }: { to: string; label: string; compact?: boolean }) {
  return (
    <Link
      to={to}
      aria-label={compact ? label : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-on-brand/14 text-meta font-semibold text-on-brand transition-[background-color,scale] duration-150 ease-snap hover:bg-on-brand/24 focus-visible:outline-on-brand active:scale-95',
        compact ? 'size-8 justify-center' : 'mb-4 py-1 pl-1 pr-3',
      )}
    >
      <span aria-hidden className={cn('grid place-items-center rounded-pill', compact ? undefined : 'size-6 bg-on-brand/18')}>
        <ChevronLeft className="size-4" />
      </span>
      {compact ? null : label}
    </Link>
  );
}

/**
 * The band's own picture: the feed. A post leaves at the top, the next one
 * stands in the middle, a finger's swipe is drawn up beside them and a like
 * pops in on the post. Decoration only — it steps aside on a narrow screen
 * and for assistive technology.
 */
function BandArt() {
  const swipe = 'M 540 168 C 540 140 536 110 538 82 C 539 66 540 58 540 46';
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 180"
      preserveAspectRatio="xMaxYMin meet"
      className="pointer-events-none absolute right-0 top-0 hidden h-45 w-[min(600px,50%)] text-on-brand [mask-image:linear-gradient(to_right,transparent,black_45%)] md:block"
    >
      {[80, 140].map((r) => (
        <circle key={r} cx="600" cy="10" r={r} fill="none" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1.5" />
      ))}
      <rect x="392" y="-62" width="84" height="104" rx="16" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="2" />
      <rect x="380" y="58" width="108" height="136" rx="18" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M 400 150 H 452 M 400 162 H 436" stroke="currentColor" strokeOpacity="0.28" strokeWidth="4" strokeLinecap="round" />
      <g className="origin-center animate-pop [transform-box:fill-box]" style={{ animationDelay: '640ms' }}>
        <path
          d="M 434 118 C 422 108 412 100 412 90 C 412 83 417 78 423 78 C 428 78 431 81 434 85 C 437 81 440 78 445 78 C 451 78 456 83 456 90 C 456 100 446 108 434 118 Z"
          fill="currentColor"
          fillOpacity="0.55"
        />
      </g>
      <path d={swipe} fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0.5 9" />
      <path d={swipe} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray="1" className="animate-draw" />
      <path d="M 528 58 L 540 44 L 552 58" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
