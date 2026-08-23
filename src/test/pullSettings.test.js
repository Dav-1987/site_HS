import { describe, expect, it } from 'vitest';
import { validateSettingsPayload } from '../../scripts/pull-settings.mjs';
import bundledDefaults from '../data/settings.default.json';

const liveSettings = {
  hero: { image: '/uploads/a.jpg', imageMobile: '', video: '' },
  featured: ['Tocador-T-20'],
  featuredCards: [],
  texts: { es: {}, en: {} },
  contact: { instagram: '', tiktok: '', whatsapp: '', phone: '', email: '' },
  seo: { image: '', title: '', description: 'Montaje gratis' },
  blocks: { featured: true, collections: true, heroPromo: true },
};

describe('validateSettingsPayload', () => {
  it('accepts a complete live payload', () => {
    expect(validateSettingsPayload({ settings: liveSettings }).seo.description).toBe(
      'Montaje gratis',
    );
  });

  it('accepts the bundled defaults it is allowed to overwrite', () => {
    expect(() => validateSettingsPayload({ settings: bundledDefaults })).not.toThrow();
  });

  it('refuses to overwrite the defaults with an error response', () => {
    expect(() => validateSettingsPayload({ error: 'unauthorized' })).toThrow('no `settings`');
  });

  it('refuses a payload missing a settings group', () => {
    const withoutSeo = { ...liveSettings, seo: undefined };
    expect(() => validateSettingsPayload({ settings: withoutSeo })).toThrow('missing: seo');
  });

  it('refuses a payload whose featured list is not an array', () => {
    expect(() =>
      validateSettingsPayload({ settings: { ...liveSettings, featured: null } }),
    ).toThrow('featured is not an array');
  });
});

// The bug this pull exists to prevent: the prerenderer has no network, so it
// renders <SettingsProvider> from these bundled defaults. If the admin's share
// copy is missing here, Home.jsx falls back to the hard-coded i18n string and
// link previews disagree with the live site.
describe('bundled defaults carry the admin share copy', () => {
  it('exposes the seo group the prerendered head is built from', () => {
    expect(bundledDefaults.seo).toMatchObject({
      image: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
    });
  });
});
