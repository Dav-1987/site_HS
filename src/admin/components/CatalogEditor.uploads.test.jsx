import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import * as api from '../api.js';
import CatalogEditor from './CatalogEditor.jsx';

// An upload takes seconds — the server writes WebP variants on a one-core box —
// and the admin stays usable meanwhile. These tests type into it while a file is
// still in flight, then check what "Сохранить" actually sends: the upload used
// to write back the catalog as it stood when the file was picked, undoing every
// edit made during those seconds, in any product, not only the one it was for.
//
// The real CatalogEditor and useCatalogEditor, with only the network mocked, so
// the whole chain from the file input up to the root state is the one /admin runs.

vi.mock('../api.js', () => ({
  fetchCatalog: vi.fn(),
  saveCatalog: vi.fn(),
  fetchSettings: vi.fn(),
  saveSettings: vi.fn(),
  uploadImage: vi.fn(),
  uploadVideo: vi.fn(),
  uploadReviewImage: vi.fn(),
  fetchRebuildStatus: vi.fn(),
  triggerRebuild: vi.fn(),
  listVersions: vi.fn(),
  restoreVersion: vi.fn(),
  fetchOrders: vi.fn(),
  deleteOrder: vi.fn(),
}));

const product = (id, name) => ({
  id,
  name,
  price: 400,
  media: [{ type: 'image', src: `/uploads/${id}.jpg` }],
  image: `/uploads/${id}.jpg`,
  images: [`/uploads/${id}.jpg`],
  material: { es: '', en: '' },
  description: { es: '', en: '' },
  visibility: 'public',
  inStock: true,
});

const CATALOG = [
  {
    slug: 'tocadores',
    name: { es: 'Tocadores', en: 'Dressing tables' },
    tagline: { es: '', en: '' },
    description: { es: '', en: '' },
    image: '',
    imageMobile: '',
    visibility: 'public',
    products: [product('Tocador-A', 'Tocador A'), product('Tocador-B', 'Tocador B')],
  },
];

// Every upload waits until the test lets it finish.
let pending;
const hold = () =>
  new Promise((resolve) => {
    pending.push(resolve);
  });
const finish = (i, url) => act(async () => pending[i]({ url }));

beforeEach(() => {
  pending = [];
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  api.fetchCatalog.mockResolvedValue({ categories: structuredClone(CATALOG) });
  api.fetchSettings.mockResolvedValue({ settings: {} });
  api.fetchRebuildStatus.mockResolvedValue({ configured: false });
  api.saveCatalog.mockImplementation(async (categories) => ({ categories }));
  api.saveSettings.mockImplementation(async (settings) => ({ settings }));
  api.uploadImage.mockImplementation(hold);
  api.uploadVideo.mockImplementation(hold);
});

const click = (name) => fireEvent.click(screen.getByRole('button', { name }));
const type = (el, value) => fireEvent.change(el, { target: { value } });
const pickFile = (input, name = 'photo.jpg') =>
  fireEvent.change(input, { target: { files: [new File(['x'], name)] } });
const fileInputIn = (text) => screen.getByText(text).closest('label').querySelector('input');

async function openAdmin() {
  render(<CatalogEditor onLogout={() => {}} />);
  await screen.findByRole('button', { name: /Tocadores/ });
}

async function saved() {
  click('Сохранить');
  await waitFor(() => expect(api.saveCatalog).toHaveBeenCalled());
  const [categories] = api.saveCatalog.mock.calls.at(-1);
  const [a, b] = categories[0].products;
  return { a, b };
}

describe('CatalogEditor — edits made while an upload runs', () => {
  it('keeps them, in the same product and in another one', async () => {
    await openAdmin();
    click(/Tocadores/);
    click(/Tocador A/);
    click(/Обложка для мобильных/);
    pickFile(fileInputIn('Загрузить изображение'));

    click(/Основная информация/);
    type(screen.getByLabelText('Название (исп.)'), 'Tocador A2');
    // Folding the card unmounts the field the upload started from — the
    // result still has to land, and on top of what happened afterwards.
    click(/Tocador A2/);
    click(/Tocador B/);
    click(/Основная информация/);
    type(screen.getByLabelText('Название (исп.)'), 'Tocador B2');

    await finish(0, '/uploads/mobile.jpg');
    const { a, b } = await saved();
    expect(a.imageMobile).toBe('/uploads/mobile.jpg');
    expect(a.name).toBe('Tocador A2');
    expect(b.name).toBe('Tocador B2');
  });

  it('keeps the gift name typed while its photo uploads', async () => {
    await openAdmin();
    click(/Tocadores/);
    click(/Tocador A/);
    // The category has a «Подарок» group too; the product's is the one that
    // follows the category rule.
    click(/Подарок.*как у категории/);
    fireEvent.change(screen.getByLabelText('Подарок к этому товару'), {
      target: { value: 'custom' },
    });
    pickFile(fileInputIn('Добавить фото'));
    type(screen.getByLabelText('Название подарка (исп.)'), 'Estantería');

    await finish(0, '/uploads/gift.jpg');
    const { a } = await saved();
    expect(a.gift.name.es).toBe('Estantería');
    expect(a.gift.images).toEqual(['/uploads/gift.jpg']);
    expect(a.gift.image).toBe('/uploads/gift.jpg');
  });

  it('keeps both of two uploads that overlap in one gallery', async () => {
    await openAdmin();
    click(/Tocadores/);
    click(/Tocador A/);
    click(/Фото и видео/);
    const add = (accept) =>
      document.querySelector(`input[type="file"][accept="${accept}"][multiple]`);
    pickFile(add('image/*'), 'photo.jpg');
    pickFile(add('video/*'), 'clip.mp4');

    await finish(0, '/uploads/photo.jpg');
    await finish(1, '/uploads/clip.mp4');
    const { a } = await saved();
    expect(a.media.map((m) => m.src)).toEqual([
      '/uploads/Tocador-A.jpg',
      '/uploads/photo.jpg',
      '/uploads/clip.mp4',
    ]);
  });

  it('keeps a settings edit made while the hero photo uploads', async () => {
    await openAdmin();
    click(/Главный экран/);
    pickFile(
      screen.getAllByText('Загрузить изображение')[0].closest('label').querySelector('input'),
    );
    click(/Превью при отправке ссылки/);
    type(screen.getByPlaceholderText('Mirage Muebles — Mobiliario minimalista'), 'Nuevo título');

    await finish(0, '/uploads/hero.jpg');
    click('Сохранить');
    await waitFor(() => expect(api.saveSettings).toHaveBeenCalled());
    const [settings] = api.saveSettings.mock.calls.at(-1);
    expect(settings.hero.image).toBe('/uploads/hero.jpg');
    expect(settings.seo.title).toBe('Nuevo título');
  });
});
