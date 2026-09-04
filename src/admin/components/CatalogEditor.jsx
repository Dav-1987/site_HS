import { useState } from 'react';
import { useCatalogEditor } from '../useCatalogEditor.js';
import { BTN_SOLID, BTN_GHOST } from '../ui.js';
import HistoryPanel from './HistoryPanel.jsx';
import OrdersPanel from './OrdersPanel.jsx';
import RebuildButton, { RebuildMenuItem } from './RebuildButton.jsx';
import OverflowMenu, { MenuItem, MenuSeparator } from './OverflowMenu.jsx';
import { useIsCompact } from '../useIsCompact.js';
import HeroSettingsEditor from './HeroSettingsEditor.jsx';
import FeaturedCardsEditor from './FeaturedCardsEditor.jsx';
import TextsEditor from './TextsEditor.jsx';
import ContactEditor from './ContactEditor.jsx';
import SeoSettingsEditor from './SeoSettingsEditor.jsx';
import BlocksEditor from './BlocksEditor.jsx';
import ReviewsEditor from './ReviewsEditor.jsx';
import CategoryEditor from './CategoryEditor.jsx';

export default function CatalogEditor({ onLogout }) {
  const {
    categories,
    settings,
    loadError,
    openIdx,
    setOpenIdx,
    dirty,
    settingsDirty,
    saving,
    status,
    showHistory,
    setShowHistory,
    allProducts,
    categoryOptions,
    updateSettings,
    updateCategory,
    removeCategory,
    moveCategory,
    addCategory,
    duplicateCategory,
    moveProducts,
    save,
    applyRestored,
  } = useCatalogEditor();

  const [showOrders, setShowOrders] = useState(false);
  const compact = useIsCompact();
  // One source for the toolbar note, rendered in the row on desktop and on its
  // own line on a phone.
  const statusNote = status || (dirty || settingsDirty ? 'Есть несохранённые изменения' : '');
  const statusClass = `text-xs ${status ? 'text-primary/60' : 'text-accent-text'}`;

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }
  if (!categories) {
    return <div className="mx-auto max-w-4xl px-6 py-20 text-primary/50">Загрузка каталога…</div>;
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Sticky toolbar */}
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:gap-x-4 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-text">Mirage Muebles</p>
            <h1 className="font-serif text-2xl font-light text-primary">Каталог</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            {!compact && statusNote && <span className={statusClass}>{statusNote}</span>}
            {/* On a phone only "Сохранить" stays out — everything else is a
                trip into the "⋯" menu, which is what keeps this row on screen
                (it used to be ~700px wide, with Save past the right edge). */}
            {compact ? (
              <OverflowMenu title="Меню админки">
                <MenuItem onClick={() => setShowOrders(true)}>Заявки</MenuItem>
                <MenuItem onClick={() => setShowHistory(true)}>История</MenuItem>
                <RebuildMenuItem />
                <MenuSeparator />
                <MenuItem onClick={onLogout}>Выйти</MenuItem>
              </OverflowMenu>
            ) : (
              <>
                <button type="button" onClick={() => setShowOrders(true)} className={BTN_GHOST}>
                  Заявки
                </button>
                <button type="button" onClick={() => setShowHistory(true)} className={BTN_GHOST}>
                  История
                </button>
                <RebuildButton />
                <button type="button" onClick={onLogout} className={BTN_GHOST}>
                  Выйти
                </button>
              </>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || (!dirty && !settingsDirty)}
              className={BTN_SOLID}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
          {/* Phone: its own full-width line under the row — an unsaved-changes
              warning must not be the thing that gets squeezed out. */}
          {compact && statusNote && (
            <span className={`basis-full ${statusClass}`}>{statusNote}</span>
          )}
        </div>
      </header>

      {showOrders && <OrdersPanel onClose={() => setShowOrders(false)} />}

      {showHistory && (
        <HistoryPanel onClose={() => setShowHistory(false)} onRestored={applyRestored} />
      )}

      <main className="mx-auto max-w-5xl space-y-4 px-3 py-6 sm:px-6 sm:py-10">
        {settings && <HeroSettingsEditor settings={settings} onChange={updateSettings} />}
        {settings && (
          <FeaturedCardsEditor
            value={settings.featuredCards || []}
            onChange={(featuredCards) => updateSettings({ ...settings, featuredCards })}
            allProducts={allProducts}
          />
        )}
        {settings && (
          <TextsEditor
            texts={settings.texts}
            onChange={(texts) => updateSettings({ ...settings, texts })}
          />
        )}
        {settings && (
          <ContactEditor
            contact={settings.contact}
            onChange={(contact) => updateSettings({ ...settings, contact })}
          />
        )}
        {settings && (
          <ReviewsEditor
            reviews={settings.reviews || []}
            onChange={(reviews) => updateSettings({ ...settings, reviews })}
            blocks={settings.blocks}
            onBlocksChange={(blocks) => updateSettings({ ...settings, blocks })}
          />
        )}
        {settings && <SeoSettingsEditor settings={settings} onChange={updateSettings} />}
        {settings && (
          <BlocksEditor
            blocks={settings.blocks}
            onChange={(blocks) => updateSettings({ ...settings, blocks })}
          />
        )}

        {categories.map((c, ci) => (
          <CategoryEditor
            key={ci}
            category={c}
            open={openIdx === ci}
            onToggle={() => setOpenIdx(openIdx === ci ? null : ci)}
            onChange={(next) => updateCategory(ci, next)}
            onRemove={() => removeCategory(ci)}
            onMove={(dir) => moveCategory(ci, dir)}
            onDuplicate={() => duplicateCategory(ci)}
            isFirst={ci === 0}
            isLast={ci === categories.length - 1}
            allProducts={allProducts}
            categoryOptions={categoryOptions}
            onMoveProducts={(ids, toSlug) => moveProducts(c.slug, ids, toSlug)}
          />
        ))}

        <button
          type="button"
          onClick={addCategory}
          className={`${BTN_GHOST} w-full justify-center py-4`}
        >
          + Добавить категорию
        </button>
      </main>
    </div>
  );
}
