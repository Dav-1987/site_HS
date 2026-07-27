import { useEffect, useRef, useState } from 'react';
import { triggerRebuild, fetchRebuildStatus } from '../api.js';
import { BTN_GHOST } from '../ui.js';

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
export default function RebuildButton() {
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

  if (configured === false) return null; // token not set up yet — nothing to show

  const busy = run?.status !== 'completed' && (clickedAt || run);
  const text = label(run, clickedAt);

  return (
    <div className="flex items-center gap-2">
      {text && (
        <a
          href={run?.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary/60 underline-offset-2 hover:underline"
        >
          {text}
        </a>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={configured === null || busy}
        className={BTN_GHOST}
        title="Пересобрать статические страницы сайта (для поисковиков) из текущих данных каталога"
      >
        Пересобрать сайт
      </button>
    </div>
  );
}
