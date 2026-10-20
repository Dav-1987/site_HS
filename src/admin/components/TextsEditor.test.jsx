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
    expect(screen.getByText(/^Изменено: 1 из \d+$/)).toBeTruthy();
  });

  it('says when every text comes from the code', () => {
    render(<TextsEditor texts={{ es: {}, en: {} }} onChange={() => {}} />);
    expect(screen.getByText('Все тексты — из кода')).toBeTruthy();
  });

  it('shows its groups at once, under Russian names', () => {
    render(<TextsEditor texts={{ es: {}, en: {} }} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Заявка: кнопка «Заказать» и форма/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^order\b/ })).toBeNull();
  });

  it('finds a text by the words the site shows, whatever its group', () => {
    render(<TextsEditor texts={{ es: {}, en: {} }} onChange={() => {}} />);
    search(SITE_TEXT.slice(0, 12));
    expect(screen.getByText(KEY)).toBeTruthy();
  });

  it('edits a found text, merging into the texts as they are', () => {
    const onChange = vi.fn();
    const texts = { es: { other: 'x' }, en: {} };
    render(<TextsEditor texts={texts} onChange={onChange} />);
    search(KEY);
    fireEvent.change(screen.getAllByPlaceholderText(SITE_TEXT)[0], { target: { value: 'Nuevo' } });
    expect(applyUpdate(onChange.mock.calls[0][0], texts).es).toEqual({
      other: 'x',
      [KEY]: 'Nuevo',
    });
  });

  it('says so when nothing matches', () => {
    render(<TextsEditor texts={{ es: {}, en: {} }} onChange={() => {}} />);
    search('zzzz-nada');
    expect(screen.getByText('Ничего не нашлось.')).toBeTruthy();
  });
});
