import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mergeSettings } from '../../data/settings.js';
import HeroSettingsEditor from './HeroSettingsEditor.jsx';

describe('Black Friday hero photo controls', () => {
  it('keeps separate desktop and mobile selections in settings', () => {
    let settings = mergeSettings({});
    render(
      <HeroSettingsEditor
        settings={settings}
        onChange={(update) => {
          settings = update(settings);
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Black Friday — главный экран/ }));
    fireEvent.change(screen.getByLabelText('Фото Black Friday для ПК'), {
      target: { value: '/uploads/desktop.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Фото Black Friday для мобильных'), {
      target: { value: '/uploads/mobile.jpg' },
    });

    expect(settings.blackFridayHero).toEqual({
      image: '/uploads/desktop.jpg',
      imageMobile: '/uploads/mobile.jpg',
    });
  });
});
