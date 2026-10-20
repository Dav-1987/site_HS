import { useAdmin } from '../useAdmin.js';
import ContactEditor from '../components/ContactEditor.jsx';
import SeoSettingsEditor from '../components/SeoSettingsEditor.jsx';
import PasswordSettings from '../components/PasswordSettings.jsx';
import SectionPending from './SectionPending.jsx';

/**
 * Настройки: the site's contacts, how its links look when shared, and the
 * admin's own password.
 */
export default function SettingsSection() {
  const { editor, settingsField } = useAdmin();
  const { settings, updateSettings } = editor;
  if (!settings) return <SectionPending />;
  return (
    <div className="space-y-4">
      <ContactEditor contact={settings.contact} onChange={settingsField('contact')} />
      <SeoSettingsEditor settings={settings} onChange={updateSettings} />
      <PasswordSettings />
    </div>
  );
}
