import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as api from '../api.js';
import AdminRoutes from '../AdminRoutes.jsx';

// An upload takes seconds — the server writes WebP variants on a one-core box —
// and the admin stays usable meanwhile. These tests type into it while a file is
// still in flight, then check what "Сохранить" actually sends: the upload used
// to write back the catalog as it stood when the file was picked, undoing every
// edit made during those seconds, in any product, not only the one it was for.
//
// The real admin — routes, shell, sections, useCatalogEditor — with only the
// network mocked, so the whole chain from the file input up to the root state
// is the one /admin runs. Including switching sections mid-upload: the editor
// the file was picked in is gone by the time it lands.

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
  {
    slug: 'espejos',
    name: { es: 'Espejos', en: 'Mirrors' },
    tagline: { es: '', en: '' },
    description: { es: '', en: '' },
    image: '',
    imageMobile: '',
    visibility: 'public',
    products: [product('Espejo-C', 'Espejo C')],
  },
];

// Every upload waits until the test lets it finish.
let pending;
const hold = () =>
  new Promise((resolve) => {
    pending.push(resolve);
  });
const finish = (i, url) => act(async () => pending[i]({ url }));

function startFresh() {
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
  api.fetchOrders.mockResolvedValue({ orders: [] });
}

beforeEach(startFresh);

const click = (name) => fireEvent.click(screen.getByRole('button', { name }));
const type = (el, value) => fireEvent.change(el, { target: { value } });
const pickFile = (input, name = 'photo.jpg') =>
  fireEvent.change(input, { target: { files: [new File(['x'], name)] } });
const fileInputIn = (text) => screen.getByText(text).closest('label').querySelector('input');

async function openAdmin() {
  render(
    <MemoryRouter initialEntries={['/admin/catalog']}>
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes onLogout={() => {}} />} />
      </Routes>
    </MemoryRouter>,
  );
  // The catalog opens on its first category.
  await screen.findByRole('link', { name: 'Tocador A' });
}

// The first admin rendered in a test file costs about twice what any test here
// does on its own: each file starts in a fresh worker, so the admin's code runs
// for the first time, and jsdom parses its built-in stylesheet on the first
// getComputedStyle — which every query by role ends in. Counted inside the first
// test, that start-up took it past the 5 s limit whenever other suites were
// running on the machine (~6 s, against ~0.4 s alone). Paid once here instead,
// under the hook's own limit, so each test is timed on its own steps.
beforeAll(async () => {
  startFresh();
  await openAdmin();
  cleanup();
});

const goTo = (section) => fireEvent.click(screen.getByRole('link', { name: section }));

async function saved() {
  click('Сохранить');
  await waitFor(() => expect(api.saveCatalog).toHaveBeenCalled());
  const [categories] = api.saveCatalog.mock.calls.at(-1);
  const all = categories.flatMap((c) => c.products);
  const byId = (id) => all.find((p) => p.id === id);
  return { a: byId('Tocador-A'), b: byId('Tocador-B'), c: byId('Espejo-C'), categories };
}

// A product opens in a side panel — at the test's 1024px, a full-screen one.
const openProduct = (name) => fireEvent.click(screen.getByRole('link', { name }));
const panel = () => within(screen.getByRole('dialog'));
const openTab = (name) => fireEvent.click(panel().getByRole('tab', { name: new RegExp(name) }));
const closeProduct = () => fireEvent.click(panel().getByRole('button', { name: 'Закрыть товар' }));
// A row's "⋯" menu, then one of its items.
const rowAction = (product, item) => {
  fireEvent.click(screen.getByRole('button', { name: `Действия с товаром ${product}` }));
  fireEvent.click(screen.getByRole('menuitem', { name: item }));
};
const pickMobileCover = (name) => {
  openProduct(name);
  openTab('Фото и видео');
  pickFile(fileInputIn('Загрузить изображение'));
};

describe('Admin — edits made while an upload runs', () => {
  it('keeps them, in the same product and in another one', async () => {
    await openAdmin();
    pickMobileCover('Tocador A');

    // Another tab unmounts the field the upload started from, and closing the
    // panel the whole product — the result still has to land, on top of what
    // happened afterwards.
    openTab('Основное');
    type(panel().getByLabelText('Название (исп.)'), 'Tocador A2');
    closeProduct();
    openProduct('Tocador B');
    type(panel().getByLabelText('Название (исп.)'), 'Tocador B2');

    await finish(0, '/uploads/mobile.jpg');
    const { a, b } = await saved();
    expect(a.imageMobile).toBe('/uploads/mobile.jpg');
    expect(a.name).toBe('Tocador A2');
    expect(b.name).toBe('Tocador B2');
  });

  it('keeps the gift name typed while its photo uploads', async () => {
    await openAdmin();
    openProduct('Tocador A');
    openTab('Акции и подарок');
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
    openProduct('Tocador A');
    openTab('Фото и видео');
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

  it('keeps a settings edit made in another section while the hero photo uploads', async () => {
    await openAdmin();
    goTo('Главная страница');
    click(/Главный экран/);
    pickFile(
      screen.getAllByText('Загрузить изображение')[0].closest('label').querySelector('input'),
    );
    goTo('Настройки');
    click(/Превью при отправке ссылки/);
    type(screen.getByPlaceholderText('Mirage Muebles — Mobiliario minimalista'), 'Nuevo título');

    await finish(0, '/uploads/hero.jpg');
    click('Сохранить');
    await waitFor(() => expect(api.saveSettings).toHaveBeenCalled());
    const [settings] = api.saveSettings.mock.calls.at(-1);
    expect(settings.hero.image).toBe('/uploads/hero.jpg');
    expect(settings.seo.title).toBe('Nuevo título');
  });

  it('keeps an unsaved catalog edit through a trip to another section', async () => {
    await openAdmin();
    openProduct('Tocador A');
    type(panel().getByLabelText('Название (исп.)'), 'Tocador A2');

    goTo('Тексты сайта');
    expect(screen.getByRole('heading', { level: 1, name: 'Тексты сайта' })).toBeTruthy();
    expect(screen.getByText('Есть несохранённые изменения')).toBeTruthy();
    goTo('Каталог');

    const { a } = await saved();
    expect(a.name).toBe('Tocador A2');
  });
});

// Where the upload lands when the list moves under it. The editors used to find
// a product by its place in the list, and an upload keeps the place it saw when
// the file was picked — so a product moved up, or one deleted above it, sent the
// photo to whichever neighbour had taken that place.
describe('Admin — an upload lands on its own product', () => {
  it('after that product was moved up', async () => {
    await openAdmin();
    pickMobileCover('Tocador B');
    closeProduct();
    rowAction('Tocador B', 'Переместить выше');

    await finish(0, '/uploads/b-mobile.jpg');
    const { a, b } = await saved();
    expect(b.imageMobile).toBe('/uploads/b-mobile.jpg');
    expect(a.imageMobile).toBeFalsy();
  });

  it('after the product above it was deleted', async () => {
    await openAdmin();
    pickMobileCover('Tocador B');
    closeProduct();
    window.confirm.mockReturnValueOnce(true);
    rowAction('Tocador A', 'Удалить товар');

    await finish(0, '/uploads/b-mobile.jpg');
    const { a, b } = await saved();
    expect(a).toBeUndefined();
    expect(b.imageMobile).toBe('/uploads/b-mobile.jpg');
  });

  it('after its whole category was moved', async () => {
    await openAdmin();
    pickMobileCover('Tocador A');
    closeProduct();
    click('Настройки категории');
    click('Переместить правее');

    await finish(0, '/uploads/a-mobile.jpg');
    const { a, c, categories } = await saved();
    expect(categories.map((cat) => cat.slug)).toEqual(['espejos', 'tocadores']);
    expect(a.imageMobile).toBe('/uploads/a-mobile.jpg');
    expect(c.imageMobile).toBeFalsy();
  });

  it('after it was moved to another category', async () => {
    await openAdmin();
    pickMobileCover('Tocador A');
    closeProduct();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Выбрать Tocador A' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Переместить в категорию' }), {
      target: { value: 'espejos' },
    });
    click('Переместить');

    await finish(0, '/uploads/a-mobile.jpg');
    const { a, categories } = await saved();
    expect(categories[1].products.map((p) => p.id)).toEqual(['Espejo-C', 'Tocador-A']);
    expect(a.imageMobile).toBe('/uploads/a-mobile.jpg');
  });

  it('after it was given a new id', async () => {
    // The id is what finds the product when the photo lands. A new one loses
    // that photo — but never to another product (see catalogOps.js).
    await openAdmin();
    pickMobileCover('Tocador A');
    openTab('Основное');
    click('Изменить…');
    type(panel().getByLabelText('Адрес страницы (ID)'), 'Tocador-B');
    expect(panel().getByRole('alert').textContent).toBe('Такой ID уже есть у другого товара');
    type(panel().getByLabelText('Адрес страницы (ID)'), 'Tocador-A2');
    click('Применить');

    await finish(0, '/uploads/a-mobile.jpg');
    const { b, categories } = await saved();
    const renamed = categories[0].products.find((p) => p.id === 'Tocador-A2');
    expect(renamed.name).toBe('Tocador A');
    expect(renamed.imageMobile).toBeFalsy();
    expect(b.imageMobile).toBeFalsy();
  });

  it('and a featured card’s cover on its own card after the cards were reordered', async () => {
    api.fetchSettings.mockResolvedValue({
      settings: { featuredCards: [{ productId: 'Tocador-A' }, { productId: 'Tocador-B' }] },
    });
    await openAdmin();
    goTo('Главная страница');
    click(/Избранное/);
    // Two cards, each with a cover slot and a video slot, in that order.
    const coverOfB = screen.getAllByText('Загрузить')[2].closest('label').querySelector('input');
    pickFile(coverOfB);
    fireEvent.click(within(coverOfB.closest('.space-y-3')).getByRole('button', { name: '↑' }));

    await finish(0, '/uploads/b-cover.jpg');
    click('Сохранить');
    await waitFor(() => expect(api.saveSettings).toHaveBeenCalled());
    const [settings] = api.saveSettings.mock.calls.at(-1);
    expect(settings.featuredCards).toEqual([
      { productId: 'Tocador-B', cover: '/uploads/b-cover.jpg', video: '' },
      { productId: 'Tocador-A', cover: '', video: '' },
    ]);
  });
});
