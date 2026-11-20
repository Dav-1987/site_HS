import { useAdmin } from '../useAdmin.js';
import HeroSettingsEditor from '../components/HeroSettingsEditor.jsx';
import FeaturedCardsEditor from '../components/FeaturedCardsEditor.jsx';
import ReviewsEditor from '../components/ReviewsEditor.jsx';
import BlocksEditor from '../components/BlocksEditor.jsx';
import SectionPending from './SectionPending.jsx';
import Collapsible from '../components/Collapsible.jsx';
import { Field } from '../components/Field.jsx';
import { translations } from '../../i18n/translations.js';

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

  return (
    <div className="space-y-4">
      <HeroSettingsEditor settings={settings} onChange={updateSettings} />
      <FeaturedCardsEditor
        value={settings.featuredCards || []}
        onChange={settingsField('featuredCards')}
        allProducts={allProducts}
        blocks={settings.blocks}
      />
      <Collapsible
        title="Каталог на главной"
        summary={settings.blocks?.homeCatalog === false ? 'выключен' : 'включён'}
      >
        <p className="text-xs leading-relaxed text-primary/75">
          Товары добавляются переключателем «На главной в каталоге» в каждой карточке товара.
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
