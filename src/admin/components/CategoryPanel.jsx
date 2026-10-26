import { useId } from 'react';
import { isTileEntryCategory } from '../../data/catalog.js';
import { BTN_GHOST, BTN_PANEL_ICON } from '../ui.js';
import { countLabel } from '../plural.js';
import { urlSafe } from '../urlSafe.js';
import { IMAGE_SPECS } from '../imageSpecs.js';
import { applyUpdate } from '../update.js';
import { Field, TextArea } from './Field.jsx';
import ImageField from './ImageField.jsx';
import VideoField from './VideoField.jsx';
import GiftEditor from './GiftEditor.jsx';
import RenameField from './RenameField.jsx';
import SidePanel from './SidePanel.jsx';
import { Chevron, CloseIcon } from './PanelIcons.jsx';
import VisibilitySelect, { VisibilityNote } from './VisibilitySelect.jsx';

function Group({ title, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * A category's own settings — names, address, pictures, description, the gift
 * for all its products — in the same side panel a product opens in. Its
 * products stay in the list beside it.
 */
export default function CategoryPanel({
  category,
  allProducts,
  sheet,
  isFirst,
  isLast,
  onClose,
  onChange,
  slugError,
  onRename,
  onMove,
  onDuplicate,
  onRemove,
}) {
  const titleId = useId();
  // Merges into the category as it is when the change lands — an upload lands
  // seconds later (see ../update.js).
  const set = (patch) => onChange((c) => ({ ...c, ...applyUpdate(patch, c) }));
  const setPair = (key, lang, value) => set((c) => ({ [key]: { ...c[key], [lang]: value } }));

  const header = (
    <div className="px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-secondary">Настройки категории</p>
          <h2 id={titleId} className="font-serif text-2xl font-normal leading-tight">
            {category.name?.es || category.slug}
          </h2>
          <p className="mt-1 text-sm text-secondary">
            {countLabel(category.products.length, ['товар', 'товара', 'товаров'])}
          </p>
        </div>
        {/* The same square buttons as a product's header, but here ↑ ↓ move the
            category itself: categories are few, and their order is what the
            site's menu, home page and catalogue show. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            aria-label="Переместить выше"
            title="Переместить выше"
            className={BTN_PANEL_ICON}
          >
            <Chevron up />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label="Переместить ниже"
            title="Переместить ниже"
            className={BTN_PANEL_ICON}
          >
            <Chevron />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть настройки категории"
            className={BTN_PANEL_ICON}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        Видимость
        <VisibilitySelect
          value={category.visibility}
          onChange={(visibility) => set({ visibility })}
          title="Видимость категории"
        />
      </label>
    </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
      <button type="button" onClick={onDuplicate} className={BTN_GHOST}>
        Дублировать
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="ml-auto min-h-11 px-1 text-xs uppercase tracking-[0.18em] text-danger hover:underline sm:min-h-0"
      >
        Удалить категорию
      </button>
    </div>
  );

  return (
    <SidePanel sheet={sheet} labelledBy={titleId} onClose={onClose} header={header} footer={footer}>
      <div className="space-y-8 px-4 py-6 sm:px-6">
        {isTileEntryCategory(category) && (
          <p className="bg-surface px-3 py-2 text-xs leading-relaxed text-primary/80">
            Этот раздел не показывается в списке коллекций — ни в меню, ни на главной, ни в
            каталоге. Вход в него один: плитка с его названием в конце сетки товаров каждой
            категории. Поэтому «Показывать» здесь означает «плитка есть», а «Скрыть из списков» —
            «плитки нет, раздел открывается только по прямой ссылке».
          </p>
        )}
        <VisibilityNote entity={category} kind="category" />

        <Group title="Название">
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Название (исп.)"
              value={category.name?.es}
              onChange={(v) => setPair('name', 'es', v)}
            />
            <Field
              label="Название (англ.)"
              value={category.name?.en}
              onChange={(v) => setPair('name', 'en', v)}
            />
            <Field
              label="Слоган (исп.)"
              value={category.tagline?.es}
              onChange={(v) => setPair('tagline', 'es', v)}
            />
            <Field
              label="Слоган (англ.)"
              value={category.tagline?.en}
              onChange={(v) => setPair('tagline', 'en', v)}
            />
          </div>
        </Group>

        <Group title="Изображения и видео">
          <ImageField
            label="Изображение категории (ПК)"
            value={category.image}
            onChange={(v) => set({ image: v })}
            frames={[['4 / 5', 'Карточка 4:5']]}
            spec={IMAGE_SPECS.card}
          />
          <ImageField
            label="Изображение категории (мобильные)"
            value={category.imageMobile}
            onChange={(v) => set({ imageMobile: v })}
            frames={[['4 / 5', 'Карточка 4:5']]}
            spec={IMAGE_SPECS.card}
          />
          <VideoField
            label="Видео категории (проигрывается при наведении)"
            value={category.video}
            onChange={(v) => set({ video: v })}
          />
        </Group>

        <Group title="Описание">
          <TextArea
            label="Описание (исп.)"
            rows={5}
            value={category.description?.es}
            onChange={(v) => setPair('description', 'es', v)}
          />
          <TextArea
            label="Описание (англ.)"
            rows={5}
            value={category.description?.en}
            onChange={(v) => setPair('description', 'en', v)}
          />
        </Group>

        <Group title="Подарок">
          <GiftEditor
            value={category.gift}
            onChange={(gift) => set((c) => ({ gift: applyUpdate(gift, c.gift) }))}
            allProducts={allProducts}
          />
          <p className="text-xs leading-relaxed text-primary/75">
            Правило для всей категории: подарок получит каждый товар в ней. У любого товара его
            можно заменить своим или отключить — в карточке товара, вкладка «Акции и подарок».
          </p>
        </Group>

        <section className="border-t border-primary/15 pt-6">
          <RenameField
            label="Адрес категории"
            prefix="hsmuebles.es/"
            value={category.slug}
            normalize={(v) => urlSafe(v, { lower: true })}
            validate={slugError}
            onRename={onRename}
            warning="Новый адрес меняет адрес страницы категории: старая ссылка на неё перестанет открываться. Страницы товаров сайт сам перенаправит на новый адрес."
          />
        </section>
      </div>
    </SidePanel>
  );
}
