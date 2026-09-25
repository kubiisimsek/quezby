import { clsx, type ClassValue } from 'clsx';
import type { CSSProperties } from 'react';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge, taught the panel's own scales. Without it `text-micro`
 * would read as a colour and be dropped next to `text-ink`.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['hero', 'display', 'title', 'heading', 'body', 'meta', 'micro'],
      radius: ['control', 'nav', 'panel', 'overlay', 'pill'],
      shadow: ['card', 'raised', 'overlay', 'primary', 'brand'],
      ease: ['snap', 'out-cubic', 'spring', 'pop'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}

/** The `style` of the `index`th item of a list that arrives in turn — pairs with `stagger`. */
export function staggered(index: number): CSSProperties {
  return { '--i': index } as CSSProperties;
}
