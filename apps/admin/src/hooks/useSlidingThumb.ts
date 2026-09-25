import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export type ThumbBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** False for the first placement, which lands without travelling. */
  animate: boolean;
};

/**
 * Where the chosen item sits inside `container`, so a pill can slide to it.
 * The first measurement places the pill; every later one lets it spring
 * there — the travel is what says which way you went. `key` is anything that
 * changes when the choice does.
 */
export function useSlidingThumb(container: RefObject<HTMLElement | null>, selector: string, key: unknown): ThumbBox | null {
  const [box, setBox] = useState<ThumbBox | null>(null);
  const placed = useRef(false);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;

    const measure = () => {
      const active = root.querySelector<HTMLElement>(selector);
      if (!active) {
        setBox(null);
        return;
      }
      setBox({
        x: active.offsetLeft,
        y: active.offsetTop,
        width: active.offsetWidth,
        height: active.offsetHeight,
        animate: placed.current,
      });
      placed.current = true;
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(root);
    return () => observer?.disconnect();
  }, [container, selector, key]);

  return box;
}
