import { useEffect, useRef, useState } from 'react';
import { triggerRebuild, fetchRebuildStatus } from '../api.js';
import { BTN_GHOST } from '../ui.js';
import { MenuItem } from './OverflowMenu.jsx';

const POLL_MS = 4000;

// "queued" | "in_progress" | "completed" (GitHub's own vocabulary) — mapped to
// a short Russian label. `conclusion` (success/failure/...) only matters once
// status is "completed".
function label(run, clickedAt) {
  if (!run || (clickedAt && new Date(run.createdAt).getTime() < clickedAt - 5000)) {
    return clickedAt ? 'Запуск…' : null;
  }
  if (run.status !== 'completed') return 'Собирается…';
  return run.conclusion === 'success' ? 'Готово ✓' : 'Ошибка ✗';
}

/**
 * Full rebuild + deploy (vite build + prerender + sitemap + upload to the
 * VPS), run on GitHub Actions rather than the VPS — see server/rebuild.js for
 * why. Catalog/settings edits are live immediately via /api/*, but the
 * prerendered HTML crawlers see only updates after a rebuild; this is how an
 * admin pushes one on demand instead of asking a developer to run it.
 */
function useRebuild() {
  const [configured, setConfigured] = useState(null); // null = not checked yet
  const [run, setRun] = useState(null);
  const [clickedAt, setClickedAt] = useState(null);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const poll = () => {
    fetchRebuildStatus()
      .then((data) => {
        setConfigured(data.configured);
        setRun(data.run);
        if (data.run?.status === 'completed') stopPolling();
      })
      .catch(() => {}); // transient — next tick retries
  };

  // Check once on mount so a finished/in-progress run from an earlier visit
  // (this tab or another admin) still shows, and the button hides entirely
  // when the feature isn't set up (no GH_REBUILD_TOKEN on the server yet).
  useEffect(() => {
    fetchRebuildStatus()
      .then((data) => {
        setConfigured(data.configured);
        setRun(data.run);
        if (data.configured && data.run?.status !== 'completed') {
          pollRef.current = setInterval(poll, POLL_MS);
        }
      })
      .catch(() => setConfigured(false));
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = async () => {
    setError('');
    setClickedAt(Date.now());
    try {
      await triggerRebuild();
      stopPolling();
      pollRef.current = setInterval(poll, POLL_MS);
    } catch (err) {
      setError(err.message || 'Не удалось запустить пересборку');
    }
  };

  return {
    // false = token not set up on the server yet; nothing to show at all.
    configured,
    error,
    runUrl: run?.url,
    statusText: label(run, clickedAt),
    busy: configured === null || (run?.status !== 'completed' && (clickedAt || run)),
    start: handleClick,
  };
}

const TITLE = 'Пересобрать статические страницы сайта (для поисковиков) из текущих данных каталога';

/** Desktop: a button in the toolbar, with the run's state next to it. */
export default function RebuildButton() {
  const { configured, error, runUrl, statusText, busy, start } = useRebuild();
  if (configured === false) return null;

  return (
    <div className="flex items-center gap-2">
      {statusText && (
        <a
          href={runUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary/60 underline-offset-2 hover:underline"
        >
          {statusText}
        </a>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button type="button" onClick={start} disabled={busy} className={BTN_GHOST} title={TITLE}>
        Пересобрать сайт
      </button>
    </div>
  );
}

/**
 * Phone: the same action as a row of the toolbar's "⋯" menu. The menu is kept
 * open on click (`keepOpen`) because this item's own label is where the run
 * reports back — a rebuild takes minutes, and closing the menu would hide it.
 */
export function RebuildMenuItem() {
  const { configured, error, statusText, busy, start } = useRebuild();
  if (configured === false) return null;

  return (
    <MenuItem keepOpen onClick={start} disabled={busy}>
      Пересобрать сайт
      {(statusText || error) && (
        <span className={`ml-auto normal-case ${error ? 'text-red-600' : 'text-primary/50'}`}>
          {error || statusText}
        </span>
      )}
    </MenuItem>
  );
}
