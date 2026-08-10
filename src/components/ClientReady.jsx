import { useEffect } from 'react';

/** Marks the first committed client tree for browser-level regression checks. */
export default function ClientReady() {
  useEffect(() => {
    const snapshotNodes = Array.from(document.querySelectorAll('head [data-prerender-head]'));
    const finish = () => {
      if (document.documentElement.dataset.reactHeadReady !== window.location.pathname) return;

      if (snapshotNodes.length > 0) {
        // Depending on browser/timing, React 19 either adopts the existing
        // hoisted nodes or installs an unmarked replacement set. Only the latter
        // needs snapshot removal; adopted nodes are already the single live set.
        const hasReplacementSet = [
          'title:not([data-prerender-head])',
          'link[rel="canonical"]:not([data-prerender-head])',
          'meta[name="description"]:not([data-prerender-head])',
        ].every((selector) => document.head.querySelector(selector));
        if (hasReplacementSet) snapshotNodes.forEach((element) => element.remove());
      }

      window.removeEventListener('react-head-ready', finish);
      document.documentElement.dataset.clientReady = 'true';
    };

    window.addEventListener('react-head-ready', finish);
    finish();

    return () => {
      window.removeEventListener('react-head-ready', finish);
      delete document.documentElement.dataset.clientReady;
    };
  }, []);
  return null;
}
