// Превращает заголовок User-Agent, сохранённый вместе с заявкой, в короткую
// строку «Dispositivo» для телеграма, письма и /admin: какое устройство и —
// главное для рекламы — был ли человек внутри приложения Instagram, Facebook,
// TikTok или Pinterest.
//
// Та же схема, что в server/attribution.js: в базе лежит сырой заголовок, а
// подпись всегда выводится заново, так что правка правил ниже переподписывает
// и старые заявки.
//
// Нарочно грубо. Без версий: браузеры всё чаще замораживают версию системы
// (Chrome пишет «Android 10» на любом Android), и число здесь часто врало бы.
// Без модели телефона: её сообщают только встроенные браузеры приложений, и то
// кодом (SM-A546B, iPhone15,3) — владелец решил её не показывать.

// С запасом для любого настоящего браузера (у встроенных бывает ~400 символов),
// но так, чтобы подделанный заголовок не раздувал таблицу заявок.
const MAX_LENGTH = 1000;

const PHONE = '📱';
const COMPUTER = '💻';

// Встроенные браузеры приложений идут первыми: их строка тоже содержит
// Chrome/Safari, и иначе заявка из Instagram выглядела бы как обычный Chrome.
const IN_APP = [
  [/Instagram/, 'Instagram (app)'],
  [/FBAN|FBAV|FB_IAB/, 'Facebook (app)'],
  [/musical_ly|Bytedance|TikTok/, 'TikTok (app)'],
  [/Pinterest/, 'Pinterest (app)'],
  [/GSA\//, 'Google (app)'],
];

// Браузеры на движке Chrome, которые пишут в строке и «Chrome/», — поэтому
// проверяются раньше него.
const BROWSERS = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|OPiOS|OPT\/|Opera/, 'Opera'],
  [/SamsungBrowser/, 'Samsung Internet'],
  [/Firefox\/|FxiOS/, 'Firefox'],
];

/** Обрезанная строка заголовка для базы или null, если хранить нечего. */
export function cleanUserAgent(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, MAX_LENGTH);
  return trimmed || null;
}

function platformOf(ua) {
  // Порядок важен: строка iPhone содержит «Mac OS X», строка Android — «Linux».
  if (/iPad/.test(ua)) return `${PHONE} iPad`;
  if (/iPhone|iPod/.test(ua)) return `${PHONE} iPhone`;
  // Телефон пишет «Mobile», браузер Android-планшета — нет.
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? `${PHONE} Android` : `${PHONE} Tablet Android`;
  if (/Windows/.test(ua)) return `${COMPUTER} Windows`;
  // iPad в Safari по умолчанию выдаёт себя за Mac — отличить его по заголовку
  // нельзя, он попадает сюда.
  if (/Macintosh|Mac OS X/.test(ua)) return `${COMPUTER} Mac`;
  if (/CrOS/.test(ua)) return `${COMPUTER} ChromeOS`;
  if (/Linux/.test(ua)) return `${COMPUTER} Linux`;
  return '';
}

// Встроенный браузер приложения, которое мы не распознали отдельно: на Android
// его выдаёт метка «wv», на iPhone — отсутствие «Safari/», которое есть у
// Safari и у всех настоящих браузеров iOS.
function isWebView(ua) {
  return /; wv\)/.test(ua) || (/iPhone|iPad|iPod/.test(ua) && !/Safari\//.test(ua));
}

function browserOf(ua) {
  for (const [pattern, label] of IN_APP) if (pattern.test(ua)) return label;
  for (const [pattern, label] of BROWSERS) if (pattern.test(ua)) return label;
  if (isWebView(ua)) return 'otra app';
  if (/Chrome\/|CriOS/.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return '';
}

/**
 * Одна строка вида «📱 iPhone · Instagram (app)» или «💻 Windows · Chrome».
 * Пусто, когда заголовка нет (старые заявки) — тогда строку не пишут вовсе;
 * «desconocido», когда он есть, но на браузер не похож (curl, скрипт).
 */
export function describeDevice(userAgent) {
  const ua = cleanUserAgent(userAgent);
  if (!ua) return '';
  const parts = [platformOf(ua), browserOf(ua)].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'desconocido';
}
