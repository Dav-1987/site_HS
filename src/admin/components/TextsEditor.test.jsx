import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { translations } from '../../i18n/translations.js';
import { applyUpdate } from '../update.js';
import TextsEditor from './TextsEditor.jsx';

// A real key, and the words the site shows for it.
const KEY = Object.keys(translations.es).find((k) => k.startsWith('hero.'));
const SITE_TEXT = translations.es[KEY];

const search = (value) =>
  fireEvent.change(screen.getByRole('searchbox', { name: 'Поиск по текстам' }), {
    target: { value },
  });

describe('TextsEditor', () => {
  it('says how many texts differ from the code', () => {
    render(<TextsEditor texts={{ es: { [KEY]: 'Otro' }, en: {} }} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Тексты сайта изменено: 1/ })).toBeTruthy();
  });

  it('finds a text by the words the site shows, whatever its group', () => {
    render(<TextsEditor texts={{ es: {}, en: {} }} onChange={() => {}} defaultOpen />);
    search(SITE_TEXT.slice(0, 12));
    expect(screen.getByText(KEY)).toBeTruthy();
  });

  it('edits a found text, merging into the texts as they are', () => {
    const onChange = vi.fn();
    const texts = { es: { other: 'x' }, en: {} };
    render(<TextsEditor texts={texts} onChange={onChange} defaultOpen />);
    search(KEY);
    fireEvent.change(screen.getAllByPlaceholderText(SITE_TEXT)[0], { target: { value: 'Nuevo' } });
    expect(applyUpdate(onChange.mock.calls[0][0], texts).es).toEqual({
      other: 'x',
      [KEY]: 'Nuevo',
    });
  });

  it('says so when nothing matches', () => {
    render(<TextsEditor texts={{ es: {}, en: {} }} onChange={() => {}} defaultOpen />);
    search('zzzz-nada');
    expect(screen.getByText('Ничего не нашлось.')).toBeTruthy();
  });
});
