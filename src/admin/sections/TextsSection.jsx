import { useAdmin } from '../useAdmin.js';
import TextsEditor from '../components/TextsEditor.jsx';
import SectionPending from './SectionPending.jsx';

/** Тексты сайта: every UI string, overridable per language. */
export default function TextsSection() {
  const { editor, settingsField } = useAdmin();
  if (!editor.settings) return <SectionPending />;
  // Alone in its section, so it opens unfolded — a closed spoiler would be one
  // click spent on nothing.
  return (
    <TextsEditor texts={editor.settings.texts} onChange={settingsField('texts')} defaultOpen />
  );
}
