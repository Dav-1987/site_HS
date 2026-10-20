import { useEffect, useEffectEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useCatalogEditor } from '../useCatalogEditor.js';
import { useOrders } from '../useOrders.js';
import { SIDEBAR_MIN_WIDTH, useIsCompact } from '../useIsCompact.js';
import { sectionFor } from '../adminSections.js';
import { applyUpdate } from '../update.js';
import { BTN_SOLID } from '../ui.js';
import HistoryPanel from './HistoryPanel.jsx';
import RebuildButton, { RebuildMenuItem } from './RebuildButton.jsx';
import OverflowMenu, { MenuItem, MenuSeparator } from './OverflowMenu.jsx';
import { AdminNavStrip, AdminSidebar } from './AdminNav.jsx';

/**
 * The frame of the admin: its sections down the left edge (a strip under the
 * toolbar on narrower screens), a toolbar with «Пересобрать сайт» and
 * «Сохранить», and the current section under it.
 *
 * The catalog and settings being edited, and the orders, live here rather than
 * in the sections, so switching sections never drops an unsaved edit — nor an
 * upload still in flight, which lands on the state as it is when it finishes
 * (see ../update.js) whichever section is open by then.
 */
export default function AdminShell({ onLogout }) {
  const editor = useCatalogEditor();
  const orders = useOrders();
  const narrow = useIsCompact(SIDEBAR_MIN_WIDTH - 1);
  const section = sectionFor(useLocation().pathname);
  const {
    dirty,
    settingsDirty,
    saving,
    status,
    saveError,
    save,
    updateSettings,
    showHistory,
    setShowHistory,
    applyRestored,
  } = editor;
  const canSave = (dirty || settingsDirty) && !saving;
  // A reading-width column for forms; the whole window for the catalog, which
  // sets its list and an open product side by side.
  const column = section?.wide ? 'max-w-[1600px]' : 'max-w-5xl';

  // One settings field, merged into the settings as they are when the change
  // lands: an upload in one editor must not undo an edit made in another while
  // it ran (see ../update.js).
  const settingsField = (key) => (next) =>
    updateSettings((s) => ({ ...s, [key]: applyUpdate(next, s[key]) }));

  const saveFromShortcut = useEffectEvent(() => {
    if (canSave) save();
  });
  useEffect(() => {
    const onKeyDown = (e) => {
      // By the physical key, so Ctrl+S works on a Russian or Spanish layout too,
      // where `e.key` is "ы" or "s".
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.code !== 'KeyS') return;
      // Never the browser's "Save page as…" inside the admin, even with nothing
      // to save.
      e.preventDefault();
      saveFromShortcut();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (section) document.title = `${section.title} — админка Mirage`;
  }, [section]);

  // One source for the toolbar note, in the row on desktop and on its own line
  // on narrower screens, where it must not be what gets squeezed out. A failed
  // save outranks everything: red, with the reason and a way to try again.
  const statusNote = status || (dirty || settingsDirty ? 'Есть несохранённые изменения' : '');
  const toolbarNote = saveError ? (
    <span role="alert" className="flex flex-wrap items-center gap-x-2 text-xs text-danger">
      Не сохранилось: {saveError}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="min-h-11 font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50 sm:min-h-0"
      >
        Повторить
      </button>
    </span>
  ) : statusNote ? (
    <span role="status" className={`text-xs ${status ? 'text-primary/75' : 'text-accent-text'}`}>
      {statusNote}
    </span>
  ) : null;

  return (
    <div className="flex min-h-screen bg-background text-primary">
      {!narrow && <AdminSidebar newOrders={orders.newCount} onLogout={onLogout} />}

      <div className="min-w-0 flex-1 pb-32">
        <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/95 backdrop-blur-md">
          {/* Same column as <main>, so the title and the buttons line up with
              the section's content rather than with the window's edges. */}
          <div
            className={`mx-auto flex ${column} flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:gap-x-4 sm:px-6 lg:px-10 lg:py-4`}
          >
            <h1 className="mr-auto min-w-0 truncate font-serif text-2xl font-light lg:text-3xl">
              {section?.title}
            </h1>
            {!narrow && toolbarNote}
            {/* Narrower screens keep only «Сохранить» in the row; the rest of
                the toolbar and the way out go behind "⋯". */}
            {narrow ? (
              <OverflowMenu title="Меню админки">
                <RebuildMenuItem />
                <MenuItem onClick={() => window.open('/', '_blank', 'noopener')}>
                  Открыть сайт
                </MenuItem>
                <MenuItem onClick={() => window.open('/utm', '_blank', 'noopener')}>
                  Ссылки UTM
                </MenuItem>
                <MenuSeparator />
                <MenuItem onClick={onLogout}>Выйти</MenuItem>
              </OverflowMenu>
            ) : (
              <RebuildButton />
            )}
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              title="Сохранить (Ctrl+S)"
              aria-keyshortcuts="Control+S"
              className={BTN_SOLID}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
            {narrow && toolbarNote && <div className="basis-full">{toolbarNote}</div>}
          </div>
          {narrow && <AdminNavStrip newOrders={orders.newCount} />}
        </header>

        <main className={`mx-auto ${column} px-3 py-6 sm:px-6 sm:py-10 lg:px-10`}>
          <Outlet context={{ editor, orders, settingsField }} />
        </main>
      </div>

      {showHistory && (
        <HistoryPanel onClose={() => setShowHistory(false)} onRestored={applyRestored} />
      )}
    </div>
  );
}
