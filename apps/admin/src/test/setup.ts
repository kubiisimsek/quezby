import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { useSession } from '@/stores/session';

// Every page loads lazily on first use: the first test of a page file pays for
// its chunk, which takes more than the default second on a busy parallel run —
// on CI's two cores beside the app's Jest, more than three.
configure({ asyncUtilTimeout: 10_000 });

// Vitest runs without `globals`, so Testing Library's own cleanup never
// registers — without this every test renders on top of the last one's DOM.
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useSession.setState({ session: null, ended: null });
  document.documentElement.classList.remove('dark');
});

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

globalThis.ResizeObserver = ResizeObserverStub;
globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;

// Radix's Select captures the pointer on its trigger and scrolls the item it
// highlights into view; jsdom implements neither.
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
Element.prototype.scrollIntoView = () => {};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
