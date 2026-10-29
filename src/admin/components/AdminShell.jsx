import { useEffect, useEffectEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useCatalogEditor } from '../useCatalogEditor.js';
import { useOrders } from '../useOrders.js';
import { useGuidesEditor } from '../useGuidesEditor.js';
import { SIDEBAR_MIN_WIDTH, useIsCompact } from '../useIsCompact.js';
import { sectionFor } from '../adminSections.js';
import { applyUpdate } from '../update.js';
import { BTN_SOLID } from '../ui.js';
import HistoryPanel from './HistoryPanel.jsx';
import RebuildButton, { RebuildMenuItem } from './RebuildButton.jsx';
import OverflowMenu, { MenuItem, MenuSeparator } from './OverflowMenu.jsx';
import { AdminNavStrip, AdminSidebar } from './AdminNav.jsx';

// A button inside the toolbar note: a link-like action on its line.
const NOTE_BUTTON =
  'min-h-11 font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50 sm:min-h-0';

// Which part of the admin another tab saved first («…уже изменили»).
const CONFLICT_SUBJECT = { catalog: 'каталог', settings: 'настройки' };

/**
 * The frame of the admin: its sections down the left edge (a strip under the
 * toolbar on narrower screens), a toolbar with «Пересобрать сайт» and
 * «Сохранить», and the current section under it.
 *
 * The catalog, settings and articles being edited, and the orders, live here
 * rather than in the sections, so switching sections never drops an unsaved edit — nor an
 * upload still in flight, which lands on the state as it is when it finishes
 * (see ../update.js) whichever section is open by then.
 */
export default function AdminShell({ onLogout }) {
  const editor = useCatalogEditor();
  const orders = useOrders();
  const guides = useGuidesEditor();
  const narrow = useIsCompact(SIDEBAR_MIN_WIDTH - 1);
  const section = sectionFor(useLocation().pathname);
  const {
    dirty,
    settingsDirty,
    saving,
    status,
    saveError,
    conflict,
    save,
    overwrite,
    reloadFromServer,
    updateSettings,
    showHistory,
    setShowHistory,
    applyRestored,
  } = editor;
  const anyDirty = dirty || settingsDirty || guides.dirty;
  const busy = saving || guides.saving;
  const canSave = anyDirty && !busy;
  // One «Сохранить» for everything: the catalog and the settings in one save,
  // then the articles changed, each in its own (see ../useGuidesEditor.js).
  const saveAll = async () => {
    if (dirty || settingsDirty) await save();
    if (guides.dirty) await guides.save();
  };
  // The conflict note carries two buttons, too much for the toolbar's row.
  const noteOnOwnLine = narrow || Boolean(conflict || guides.conflict);
  // A reading-width column for forms; the whole window for the catalog, which
  // sets its list and an open product side by side.
  const column = section?.wide ? 'max-w-[1600px]' : 'max-w-5xl';

  // One settings field, merged into the settings as they are when the change
  // lands: an upload in one editor must not undo an edit made in another while
  // it ran (see ../update.js).
  const settingsField = (key) => (next) =>
    updateSettings((s) => ({ ...s, [key]: applyUpdate(next, s[key]) }));

  const saveFromShortcut = useEffectEvent(() => {
    if (canSave) saveAll();
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
  // on narrower screens, where it must not be what gets squeezed out. A save
  // turned away because another tab saved first outranks everything — retrying
  // would only be turned away again, so it offers the two ways out instead. Then
  // a failed save: red, with the reason and a way to try again.
  const doneNote = status || guides.status;
  const statusNote = doneNote || (anyDirty ? 'Есть несохранённые изменения' : '');
  const toolbarNote = conflict ? (
    <span role="alert" className="flex flex-wrap items-center gap-x-3 text-xs text-danger">
      Не сохранилось: {CONFLICT_SUBJECT[conflict]} уже изменили в другой вкладке или на другом
      устройстве.
      <button type="button" onClick={reloadFromServer} disabled={saving} className={NOTE_BUTTON}>
        Загрузить свежую версию
      </button>
      <button type="button" onClick={overwrite} disabled={saving} className={NOTE_BUTTON}>
        Сохранить мои поверх
      </button>
    </span>
  ) : guides.conflict ? (
    <span role="alert" className="flex flex-wrap items-center gap-x-3 text-xs text-danger">
      Не сохранилось: статью «{guides.conflict.name}» уже изменили в другой вкладке или на другом
      устройстве.
      <button
        type="button"
        onClick={guides.reloadFromServer}
        disabled={busy}
        className={NOTE_BUTTON}
      >
        Загрузить свежую версию
      </button>
      <button type="button" onClick={guides.overwrite} disabled={busy} className={NOTE_BUTTON}>
        Сохранить мою поверх
      </button>
    </span>
  ) : saveError || guides.saveError ? (
    <span role="alert" className="flex flex-wrap items-center gap-x-2 text-xs text-danger">
      Не сохранилось: {saveError || guides.saveError}
      <button type="button" onClick={saveAll} disabled={busy} className={NOTE_BUTTON}>
        Повторить
      </button>
    </span>
  ) : statusNote ? (
    <span role="status" className={`text-xs ${doneNote ? 'text-primary/75' : 'text-accent-text'}`}>
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
            {!noteOnOwnLine && toolbarNote}
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
              onClick={saveAll}
              disabled={!canSave}
              title="Сохранить (Ctrl+S)"
              aria-keyshortcuts="Control+S"
              className={BTN_SOLID}
            >
              {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
            {noteOnOwnLine && toolbarNote && <div className="basis-full">{toolbarNote}</div>}
          </div>
          {narrow && <AdminNavStrip newOrders={orders.newCount} />}
        </header>

        <main className={`mx-auto ${column} px-3 py-6 sm:px-6 sm:py-10 lg:px-10`}>
          <Outlet context={{ editor, orders, guides, settingsField }} />
        </main>
      </div>

      {showHistory && (
        <HistoryPanel onClose={() => setShowHistory(false)} onRestored={applyRestored} />
      )}
    </div>
  );
}
