import { afterEach } from 'vitest';

// Everything below props up a DOM that jsdom leaves incomplete. Server tests
// opt into `@vitest-environment node` (see server/index.routes.test.js), where
// there is no window to patch — and where a stubbed fetch would break tests
// that talk to a real listening port. So the whole block is browser-only.
if (typeof window !== 'undefined') {
  // Imported here rather than at the top: @testing-library/react is meaningless
  // without a DOM, and this file is loaded for the node environment too.
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => cleanup());

  // jsdom in this setup doesn't expose localStorage — provide an in-memory one
  // (the catalog/settings/language providers read+write it on mount).
  if (!window.localStorage) {
    const store = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
        key: (i) => Array.from(store.keys())[i] ?? null,
        get length() {
          return store.size;
        },
      },
    });
  }

  // jsdom doesn't implement matchMedia. Report `matches: true` so components that
  // gate on `prefers-reduced-motion` (Layout's Lenis, Reveal's GSAP) take the
  // static path — keeping smoke tests free of animation/rAF machinery.
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  }

  // Used by ProductCarousel; jsdom has no ResizeObserver.
  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // Contexts fetch /api/* on mount. There's no server in tests, and a
  // never-resolving promise keeps them on the bundled defaults without any
  // post-render state updates (no act() noise).
  if (!global.fetch) {
    global.fetch = () => new Promise(() => {});
  }
}
