import { useAdmin } from '../useAdmin.js';
import HeroSettingsEditor from '../components/HeroSettingsEditor.jsx';
import FeaturedCardsEditor from '../components/FeaturedCardsEditor.jsx';
import ReviewsEditor from '../components/ReviewsEditor.jsx';
import BlocksEditor from '../components/BlocksEditor.jsx';
import SectionPending from './SectionPending.jsx';

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
