// Разметка рекламных ссылок: правила, из которых собирается генератор на /utm.
//
// Отдельно от компонента, потому что здесь нет ни одного слова про вёрстку, а
// проверять надо именно это: что уедет в ссылку, что сайт из неё прочитает и
// что владелец увидит в заявке. Значения сверены с тем, как метки читает
// src/lib/attribution.js и как их подписывает server/attribution.js — если
// когда-нибудь разойдётся, генератор начнёт советовать то, чего сайт не поймёт.

export const SITE = 'https://hsmuebles.es';

/** Разделы сайта — то, на что имеет смысл вести рекламу. */
export const PAGES = [
  ['/', 'Главная'],
  ['/tocadores', 'Tocadores'],
  ['/tocadores-loft', 'Tocadores Loft'],
  ['/espejos', 'Espejos'],
  ['/estanterias', 'Estanterías'],
  ['/otros-modelos', 'Otros modelos'],
  ['/opiniones', 'Отзывы'],
  ['custom', 'Другая страница — вписать адрес'],
];

// Сценарии отличаются двумя вещами: какие значения подставить и работают ли
// макросы. Макрос — это `{{...}}`, который разворачивает сама рекламная
// площадка; вне кабинета он приезжает в заявку буквально, поэтому сценарий
// обязан знать, где он уместен.
//
// Результат всегда одинаковый — ссылка целиком. В рекламных кабинетах есть и
// второй способ (хвост отдельно, в поле «Параметры URL»), но одна готовая
// ссылка — это одно поле, один копипаст и один способ ошибиться вместо двух.
export const SCENARIOS = {
  meta: {
    name: 'Реклама в Meta',
    sub: 'Instagram и Facebook Ads',
    target: 'в поле адреса сайта у объявления',
    note: 'Ads Manager → уровень объявления → «Сайт»: вставьте туда ссылку целиком. Поле «Параметры URL» тогда оставьте пустым, иначе метки задвоятся.',
    macros: true,
    network: 'Meta Ads',
    values: {
      page: '/tocadores',
      source: '{{site_source_name}}',
      medium: 'cpc',
      campaign: '',
      content: '{{ad.name}}',
      term: '{{placement}}',
    },
  },
  bio: {
    name: 'Шапка профиля',
    sub: 'Instagram, ссылка в био',
    target: 'в поле «сайт» в профиле',
    note: 'Instagram → редактировать профиль → сайт. Или в Linktree, если ссылок несколько.',
    macros: false,
    network: '',
    values: {
      page: '/',
      source: 'instagram',
      medium: 'social',
      campaign: 'bio',
      content: '',
      term: '',
    },
  },
  stories: {
    name: 'Сторис или пост',
    sub: 'бесплатные публикации',
    target: 'в наклейку или в текст поста',
    note: 'Наклейка «ссылка» в сторис или ссылка в тексте поста. Макросы здесь не подставляются — значения пишем руками.',
    macros: false,
    network: '',
    values: {
      page: '/tocadores',
      source: 'instagram',
      medium: 'social',
      campaign: '',
      content: '',
      term: '',
    },
  },
  google: {
    name: 'Google Ads',
    sub: 'поисковые кампании',
    target: 'в конечный URL объявления',
    note: 'Google Ads → объявление → «Конечный URL»: вставьте ссылку целиком. Свой gclid Google допишет сам, источник определится и без меток.',
    macros: true,
    network: 'Google Ads',
    values: {
      page: '/tocadores',
      source: 'google',
      medium: 'cpc',
      campaign: '',
      content: '',
      term: '{keyword}',
    },
  },
  marketplace: {
    name: 'Wallapop и доски',
    sub: 'профиль или объявление',
    target: 'в описание профиля или объявления',
    note: 'В описании профиля или объявления. Единственный способ понять, сколько заявок приносит площадка без собственной статистики.',
    macros: false,
    network: '',
    values: {
      page: '/',
      source: 'wallapop',
      medium: 'marketplace',
      campaign: 'perfil',
      content: '',
      term: '',
    },
  },
  direct: {
    name: 'WhatsApp, визитка, QR',
    sub: 'офлайн и переписка',
    target: 'в рассылку, на визитку или в QR',
    note: 'Ссылка в рассылке, на визитке или под QR-кодом. Так видно, что приносит офлайн.',
    macros: false,
    network: '',
    values: {
      page: '/',
      source: 'whatsapp',
      medium: 'direct',
      campaign: 'tarjeta',
      content: '',
      term: '',
    },
  },
};

export const FIELDS = ['source', 'medium', 'campaign', 'content', 'term'];
const REQUIRED = ['source', 'medium', 'campaign'];

// Как сайт подписывает источник в заявке — копия SOURCE_LABELS из
// server/attribution.js. Значения не из этого списка тоже работают, просто
// приедут как написаны.
const SOURCE_LABELS = {
  ig: 'Instagram',
  instagram: 'Instagram',
  fb: 'Facebook',
  facebook: 'Facebook',
  an: 'Audience Network',
  msg: 'Messenger',
  google: 'Google',
  bing: 'Bing',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  email: 'Email',
  newsletter: 'Newsletter',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

// Типы трафика, по которым аналитика раскладывает источники. Всё, чего здесь
// нет, — повод предупредить: чаще всего это `new` или `promo` вместо `cpc`,
// после чего реклама уезжает в отчёт как бесплатный трафик.
const KNOWN_MEDIUM = [
  'cpc',
  'ppc',
  'paid_social',
  'social',
  'email',
  'marketplace',
  'direct',
  'referral',
  'organic',
];

const MACRO = /\{\{.+?\}\}|\{keyword\}/;

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Адрес страницы из того, что вставили в поле: и полная ссылка с чужими
 * параметрами, и просто путь приводятся к одному виду. Вставить ссылку прямо
 * из адресной строки — самый быстрый способ указать товар, и он не должен
 * требовать от человека ничего вычищать руками.
 */
export function normalizePath(input) {
  const text = clean(input);
  if (!text) return '/';
  const withHost = text.match(/^https?:\/\/[^/]*(\/[^?#]*)?/i);
  let path = withHost ? withHost[1] || '/' : text.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  return path.replace(/\/+$/, '') || '/';
}

/** Примеры под полем: в кабинете уместны макросы, в сторис — готовые значения. */
export function examplesFor(field, scenarioKey) {
  const sc = SCENARIOS[scenarioKey] ?? SCENARIOS.meta;
  const google = scenarioKey === 'google';
  switch (field) {
    case 'source':
      if (!sc.macros) return ['instagram', 'facebook', 'wallapop', 'whatsapp', 'telegram', 'email'];
      return google ? ['google'] : ['{{site_source_name}}', 'instagram', 'facebook'];
    case 'medium':
      return sc.macros ? ['cpc'] : ['social', 'email', 'marketplace', 'direct'];
    case 'campaign':
      return ['hov', 'rebajas-marzo', 'tocadores-nuevos', 'black-friday'];
    case 'content':
      if (!sc.macros) return ['historia-1', 'foto-blanca', 'boton-perfil'];
      return google ? ['anuncio-1', 'anuncio-2'] : ['{{ad.name}}', '{{ad.id}}'];
    case 'term':
      if (!sc.macros) return [];
      return google ? ['{keyword}'] : ['{{placement}}'];
    default:
      return [];
  }
}

/**
 * Что не так с одним полем — строкой, которую можно показать прямо под ним.
 * Пусто — значит всё в порядке.
 */
export function fieldIssue(field, rawValue, scenarioKey) {
  const sc = SCENARIOS[scenarioKey] ?? SCENARIOS.meta;
  const value = clean(rawValue);
  if (!value) {
    return REQUIRED.includes(field) ? 'Без этого источник в заявке не определится.' : '';
  }
  if (/\s/.test(value)) return 'Есть пробел — замените на дефис.';
  if (/[а-яё]/i.test(value)) return 'Русские буквы превратятся в нечитаемый набор символов.';
  if (/[A-Z]/.test(value)) {
    return 'Заглавные буквы делают из этого отдельный источник в отчёте. Переведите в маленькие.';
  }
  if (!sc.macros && MACRO.test(value)) {
    return 'Макрос сработает только внутри рекламного кабинета. Здесь он приедет в заявку как есть — впишите значение руками.';
  }
  if (field === 'medium' && !KNOWN_MEDIUM.includes(value.toLowerCase())) {
    return `«${value}» — необычный тип трафика. Платная реклама должна быть cpc, иначе попадёт в отчёт как бесплатная.`;
  }
  return '';
}

/** Пары `utm_*=значение` в том порядке, в каком их принято писать. */
export function utmPairs(values) {
  return FIELDS.map((f) => [`utm_${f}`, clean(values?.[f])]).filter(([, v]) => v);
}

/**
 * Готовая ссылка — всегда целиком, вместе с адресом страницы. `pairs` и `path`
 * отдаём наружу, чтобы страница подсветила имена меток, не разбирая строку
 * обратно.
 */
export function buildLink({ page, values }) {
  const pairs = utmPairs(values);
  const tail = pairs.map(([k, v]) => `${k}=${v}`).join('&');
  const path = normalizePath(page);
  return { pairs, tail, path, link: `${SITE}${path}${tail ? `?${tail}` : ''}` };
}

/**
 * Разбор уже существующей ссылки — чтобы проверить то, что где-то стоит, а не
 * только собрать новое. Принимает и полную ссылку, и голый хвост из кабинета.
 * Возвращает null, если меток в ней нет вовсе.
 */
export function parseLink(raw) {
  const text = clean(raw);
  if (!text) return null;
  const query = text.includes('?') ? text.slice(text.indexOf('?') + 1) : text;
  const values = {};
  for (const part of query.split('&')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const key = part.slice(0, i);
    if (!key.startsWith('utm_')) continue;
    const field = key.slice(4);
    if (FIELDS.includes(field)) {
      values[field] = decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
    }
  }
  if (!Object.keys(values).length) return null;
  const match = text.match(/^https?:\/\/[^/]+(\/[^?#]*)/);
  return { page: match ? match[1] || '/' : '/', values };
}

/**
 * Те же три строки, что придут владельцу в Telegram (см. formatOrderText в
 * server/order.js). Показываем их прямо в генераторе: разметка, которую нельзя
 * увидеть до первой заявки, проверяется только так.
 */
export function orderPreview({ scenario, page, values }) {
  const sc = SCENARIOS[scenario] ?? SCENARIOS.meta;
  const source = clean(values?.source);
  const medium = clean(values?.medium);
  const campaign = clean(values?.campaign);
  const isMacro = MACRO.test(source);
  // Макрос до показа не разворачивается; берём самый частый его результат,
  // иначе строка выглядела бы поломанной там, где она как раз в порядке.
  const label = isMacro ? 'Instagram' : SOURCE_LABELS[source.toLowerCase()] || source;
  const parts = [sc.network, label].filter(Boolean);
  const fuente = parts.length
    ? `${parts.join(' · ')}${campaign ? ` — «${campaign}»` : ''}`
    : 'Directo / desconocido';

  const named = [clean(values?.content), clean(values?.term)]
    .filter(Boolean)
    .join(' · ')
    .replace('{{placement}}', 'Instagram_Stories')
    .replace('{{ad.name}}', 'foto-blanca')
    .replace('{{ad.id}}', '120214887654')
    .replace('{keyword}', 'tocador hollywood');

  return {
    fuente,
    anuncio: named ? `${named}${medium ? ` (${medium})` : ''}` : '',
    entrada: normalizePath(page),
  };
}
