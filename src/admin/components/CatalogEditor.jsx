import { useCatalogEditor } from '../useCatalogEditor.js';
import { BTN_SOLID, BTN_GHOST } from '../ui.js';
import HistoryPanel from './HistoryPanel.jsx';
import HeroSettingsEditor from './HeroSettingsEditor.jsx';
import FeaturedCardsEditor from './FeaturedCardsEditor.jsx';
import TextsEditor from './TextsEditor.jsx';
import ContactEditor from './ContactEditor.jsx';
import SeoSettingsEditor from './SeoSettingsEditor.jsx';
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
    updateSettings,
    updateCategory,
    removeCategory,
    moveCategory,
    addCategory,
    duplicateCategory,
    save,
    applyRestored,
  } = useCatalogEditor();

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }
  if (!categories) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-primary/50">Загрузка каталога…</div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Sticky toolbar */}
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-accent">HS Muebles</p>
            <h1 className="font-serif text-2xl font-light text-primary">Каталог</h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {status && <span className="text-xs text-primary/60">{status}</span>}
            {(dirty || settingsDirty) && !status && (
              <span className="text-xs text-accent">Есть несохранённые изменения</span>
            )}
            <button type="button" onClick={() => setShowHistory(true)} className={BTN_GHOST}>
              История
            </button>
            <button type="button" onClick={onLogout} className={BTN_GHOST}>
              Выйти
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || (!dirty && !settingsDirty)}
              className={BTN_SOLID}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </header>

      {showHistory && (
        <HistoryPanel onClose={() => setShowHistory(false)} onRestored={applyRestored} />
      )}

      <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
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
        {settings && <SeoSettingsEditor settings={settings} onChange={updateSettings} />}

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
          />
        ))}

        <button type="button" onClick={addCategory} className={`${BTN_GHOST} w-full justify-center py-4`}>
          + Добавить категорию
        </button>
      </main>
    </div>
  );
}
