import { describe, it, expect } from 'vitest';
import {
  buildLink,
  examplesFor,
  fieldIssue,
  normalizePath,
  orderPreview,
  parseLink,
  SCENARIOS,
} from './spec.js';

const values = {
  source: 'instagram',
  medium: 'cpc',
  campaign: 'hov',
  content: '2_stell',
  term: '',
};

describe('normalizePath', () => {
  // Самый быстрый способ указать товар — вставить его ссылку из адресной
  // строки. Значит, поле обязано принимать её как есть.
  it('вынимает путь из полной ссылки', () => {
    expect(normalizePath('https://hsmuebles.es/tocadores/Tocador-L-01')).toBe(
      '/tocadores/Tocador-L-01',
    );
  });

  it('отбрасывает чужие параметры и якорь', () => {
    expect(normalizePath('https://hsmuebles.es/espejos?utm_source=ig#top')).toBe('/espejos');
  });

  it('принимает и просто путь, со слэшем и без', () => {
    expect(normalizePath('/estanterias')).toBe('/estanterias');
    expect(normalizePath('estanterias')).toBe('/estanterias');
  });

  it('приводит хвостовой слэш и пустоту к главной', () => {
    expect(normalizePath('https://hsmuebles.es/')).toBe('/');
    expect(normalizePath('/tocadores/')).toBe('/tocadores');
    expect(normalizePath('')).toBe('/');
  });
});

describe('buildLink', () => {
  // Результат — всегда ссылка целиком: её вставляют одним копипастом и в поле
  // адреса объявления, и в шапку профиля.
  it('собирает ссылку целиком, вместе с адресом страницы', () => {
    const out = buildLink({ page: '/tocadores', values });
    expect(out.link).toBe(
      'https://hsmuebles.es/tocadores?utm_source=instagram&utm_medium=cpc&utm_campaign=hov&utm_content=2_stell',
    );
  });

  it('принимает в адрес страницы готовую ссылку', () => {
    const out = buildLink({ page: 'https://hsmuebles.es/tocadores/Tocador-L-01', values });
    expect(out.path).toBe('/tocadores/Tocador-L-01');
    expect(out.link).toContain('https://hsmuebles.es/tocadores/Tocador-L-01?utm_source=');
  });

  it('пропускает пустые метки, а не пишет их пустыми', () => {
    const out = buildLink({ page: '/', values: { source: 'instagram' } });
    expect(out.link).toBe('https://hsmuebles.es/?utm_source=instagram');
  });

  it('без единой метки оставляет чистый адрес', () => {
    expect(buildLink({ page: '/espejos', values: {} }).link).toBe('https://hsmuebles.es/espejos');
  });
});

describe('fieldIssue', () => {
  it('молчит, когда всё в порядке', () => {
    for (const [field, value] of Object.entries(values)) {
      if (value) expect(fieldIssue(field, value, 'bio')).toBe('');
    }
  });

  it('требует три метки, без которых источник не определится', () => {
    expect(fieldIssue('source', '', 'bio')).toMatch(/не определится/);
    expect(fieldIssue('medium', '', 'bio')).toMatch(/не определится/);
    expect(fieldIssue('campaign', '', 'bio')).toMatch(/не определится/);
  });

  it('не требует того, что можно пропустить', () => {
    expect(fieldIssue('content', '', 'bio')).toBe('');
    expect(fieldIssue('term', '', 'bio')).toBe('');
  });

  it.each([
    ['пробел', 'rebajas marzo', /пробел/],
    ['русские буквы', 'скидки', /Русские буквы/],
    ['заглавные буквы', 'Instagram', /Заглавные/],
  ])('ловит %s', (_, value, expected) => {
    expect(fieldIssue('campaign', value, 'bio')).toMatch(expected);
  });

  // Главная ошибка, которую невозможно заметить глазами: в отчёте платная
  // реклама молча превращается в бесплатный трафик.
  it('предупреждает про тип трафика, который аналитика не считает рекламой', () => {
    expect(fieldIssue('medium', 'new', 'meta')).toMatch(/должна быть cpc/);
    expect(fieldIssue('medium', 'cpc', 'meta')).toBe('');
  });

  // Макрос разворачивает сама площадка; в сторис он приедет как есть.
  it('разрешает макросы в кабинете и запрещает вне его', () => {
    expect(fieldIssue('term', '{{placement}}', 'meta')).toBe('');
    expect(fieldIssue('term', '{{placement}}', 'stories')).toMatch(/только внутри рекламного/);
  });
});

describe('parseLink', () => {
  it('вынимает страницу и метки из готовой ссылки', () => {
    const out = parseLink(
      'https://hsmuebles.es/tocadores?utm_source=instagram&utm_medium=cpc&utm_campaign=hov',
    );
    expect(out.page).toBe('/tocadores');
    expect(out.values).toEqual({ source: 'instagram', medium: 'cpc', campaign: 'hov' });
  });

  it('понимает и голый хвост из рекламного кабинета', () => {
    expect(parseLink('utm_source=ig&utm_medium=cpc').values).toEqual({
      source: 'ig',
      medium: 'cpc',
    });
  });

  it('пропускает чужие параметры, включая fbclid', () => {
    const out = parseLink('https://hsmuebles.es/?fbclid=IwAR1&utm_source=ig&gclid=x');
    expect(out.values).toEqual({ source: 'ig' });
  });

  it('возвращает null, когда меток нет', () => {
    expect(parseLink('https://hsmuebles.es/tocadores')).toBeNull();
    expect(parseLink('')).toBeNull();
  });
});

describe('orderPreview', () => {
  // То же, что соберёт server/order.js, — чтобы разметку можно было проверить
  // до первой живой заявки.
  it('показывает три строки заявки для рекламы', () => {
    expect(
      orderPreview({
        scenario: 'meta',
        page: '/tocadores',
        values: {
          source: '{{site_source_name}}',
          medium: 'cpc',
          campaign: 'hov',
          term: '{{placement}}',
        },
      }),
    ).toEqual({
      fuente: 'Meta Ads · Instagram — «hov»',
      anuncio: 'Instagram_Stories (cpc)',
      entrada: '/tocadores',
    });
  });

  it('подписывает источник теми же словами, что и сайт', () => {
    expect(orderPreview({ scenario: 'bio', page: '/', values: { source: 'ig' } }).fuente).toBe(
      'Instagram',
    );
  });

  it('без источника честно говорит, что он не определится', () => {
    expect(orderPreview({ scenario: 'bio', page: '/', values: {} }).fuente).toBe(
      'Directo / desconocido',
    );
  });
});

describe('examplesFor', () => {
  it('предлагает макросы там, где они работают', () => {
    expect(examplesFor('term', 'meta')).toContain('{{placement}}');
    expect(examplesFor('term', 'stories')).toEqual([]);
  });

  it('не предлагает того, что поле само же и забракует', () => {
    for (const scenario of Object.keys(SCENARIOS)) {
      for (const field of ['source', 'medium', 'campaign', 'content', 'term']) {
        for (const example of examplesFor(field, scenario)) {
          expect([field, example, fieldIssue(field, example, scenario)]).toEqual([
            field,
            example,
            '',
          ]);
        }
      }
    }
  });
});
