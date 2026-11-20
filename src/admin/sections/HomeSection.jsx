import { useAdmin } from '../useAdmin.js';
import HeroSettingsEditor from '../components/HeroSettingsEditor.jsx';
import FeaturedCardsEditor from '../components/FeaturedCardsEditor.jsx';
import ReviewsEditor from '../components/ReviewsEditor.jsx';
import BlocksEditor from '../components/BlocksEditor.jsx';
import SectionPending from './SectionPending.jsx';
import Collapsible from '../components/Collapsible.jsx';
import { Field } from '../components/Field.jsx';
import HomeCatalogOrderEditor from '../components/HomeCatalogOrderEditor.jsx';
import { translations } from '../../i18n/translations.js';
import { homeCatalogLayouts } from '../../data/settings.js';
import { homeCatalogProducts } from '../../data/catalog.js';

const TITLE_KEY = 'section.homeCatalog.title';

/**
 * Главная страница: the blocks of the home page, top to bottom. Waits for the
 * catalog too — the «Избранное» picker lists its products, and an empty list
 * would mark every chosen card as deleted.
 */
export default function HomeSection() {
  const { editor, settingsField } = useAdmin();
  const { settings, categories, loadError, allProducts, updateSettings } = editor;

  if (!settings || !categories) return <SectionPending error={loadError} />;

  const catalogLayouts = homeCatalogLayouts(settings.blocks);
  const catalogProducts = homeCatalogProducts(categories);
  const catalogSummary =
    catalogLayouts.mobile && catalogLayouts.desktop
      ? 'на мобильных и ПК'
      : catalogLayouts.mobile
        ? 'только на мобильных'
        : catalogLayouts.desktop
          ? 'только на ПК'
          : 'выключен';

  return (
    <div className="space-y-4">
      <HeroSettingsEditor settings={settings} onChange={updateSettings} />
      <FeaturedCardsEditor
        value={settings.featuredCards || []}
        onChange={settingsField('featuredCards')}
        allProducts={allProducts}
        blocks={settings.blocks}
      />
      <Collapsible title="Каталог на главной" summary={catalogSummary}>
        <p className="text-xs leading-relaxed text-primary/75">
          Товары добавляются переключателем «На главной в каталоге» в карточке товара или массово
          через выбор товаров в разделе «Каталог».
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {['es', 'en'].map((lang) => (
            <Field
              key={lang}
              label={`Название блока (${lang.toUpperCase()})`}
              value={settings.texts?.[lang]?.[TITLE_KEY] ?? ''}
              placeholder={translations[lang][TITLE_KEY]}
              onChange={(value) =>
                settingsField('texts')((texts) => ({
                  ...texts,
                  [lang]: { ...texts?.[lang], [TITLE_KEY]: value },
                }))
              }
            />
          ))}
        </div>
        <HomeCatalogOrderEditor
          products={catalogProducts}
          order={settings.homeCatalogOrder}
          onChange={settingsField('homeCatalogOrder')}
        />
      </Collapsible>
      <ReviewsEditor
        reviews={settings.reviews || []}
        onChange={settingsField('reviews')}
        blocks={settings.blocks}
        onBlocksChange={settingsField('blocks')}
      />
      <BlocksEditor blocks={settings.blocks} onChange={settingsField('blocks')} />
    </div>
  );
}
