import { describe, it, expect } from 'vitest';
import { cleanUserAgent, describeDevice } from './device.js';

// Настоящие строки браузеров — по одной на каждый случай из таблицы, которую
// согласовали с владельцем.
const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/129.0 Mobile/15E148 Safari/605.1.15',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 347.0.0.21.95 (iPhone15,3; iOS 17_5; es_ES; es; scale=3.00; 1290x2796; 634617431)',
  iphoneFacebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/478.0.0.40.108;FBBV/634099466;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/es_ES;FBOP/5;FBRV/636175212]',
  iphoneTikTok:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/es Region/ES isDarkMode/0 WKWebView/1 BytedanceWebview/d8a21c6',
  iphonePinterest:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [Pinterest/iOS]',
  iphoneGoogleApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/330.0.665236494 Mobile/15E148 Safari/604.1',
  iphoneOtherApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  androidSamsung:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0',
  androidInstagram:
    'Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.146 Mobile Safari/537.36 Instagram 347.0.0.36.89 Android (34/14; 450dpi; 1080x2340; samsung; SM-A546B; a54x; s5e8835; es_ES; 634015853)',
  androidFacebook:
    'Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.146 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/479.0.0.51.64;]',
  androidGoogleApp:
    'Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.146 Mobile Safari/537.36 GSA/15.35.44.29.arm64',
  androidOtherApp:
    'Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.146 Mobile Safari/537.36',
  androidTabletChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  ipadInstagram:
    'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 347.0.0.21.95 (iPad13,4; iPadOS 17_5; es_ES; es; scale=2.00; 1668x2388; 634617431)',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  windowsFirefox:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  windowsOpera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/113.0.0.0',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  chromeOS:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
};

describe('describeDevice — телефоны', () => {
  it.each([
    ['iphoneSafari', '📱 iPhone · Safari'],
    ['iphoneChrome', '📱 iPhone · Chrome'],
    ['iphoneFirefox', '📱 iPhone · Firefox'],
    ['androidChrome', '📱 Android · Chrome'],
    ['androidSamsung', '📱 Android · Samsung Internet'],
    ['androidFirefox', '📱 Android · Firefox'],
  ])('%s → %s', (key, label) => {
    expect(describeDevice(UA[key])).toBe(label);
  });
});

// Ради этого всё и затевалось: встроенный браузер приложения часто теряет
// источник, и строка устройства — единственное, что его выдаёт.
describe('describeDevice — внутри приложений', () => {
  it.each([
    ['iphoneInstagram', '📱 iPhone · Instagram (app)'],
    ['iphoneFacebook', '📱 iPhone · Facebook (app)'],
    ['iphoneTikTok', '📱 iPhone · TikTok (app)'],
    ['iphonePinterest', '📱 iPhone · Pinterest (app)'],
    ['iphoneGoogleApp', '📱 iPhone · Google (app)'],
    ['androidInstagram', '📱 Android · Instagram (app)'],
    ['androidFacebook', '📱 Android · Facebook (app)'],
    ['androidGoogleApp', '📱 Android · Google (app)'],
  ])('%s → %s', (key, label) => {
    expect(describeDevice(UA[key])).toBe(label);
  });

  // Приложение, которого нет в списке, всё равно не выдаётся за Chrome или
  // Safari: человек был не в браузере, и это стоит знать.
  it('называет нераспознанное приложение «otra app», а не браузером', () => {
    expect(describeDevice(UA.iphoneOtherApp)).toBe('📱 iPhone · otra app');
    expect(describeDevice(UA.androidOtherApp)).toBe('📱 Android · otra app');
  });

  // Решение владельца: без моделей — ни кода Android, ни кода iPhone.
  it('не показывает модель телефона, даже когда приложение её сообщает', () => {
    for (const key of [
      'androidInstagram',
      'androidFacebook',
      'iphoneInstagram',
      'iphoneFacebook',
    ]) {
      const label = describeDevice(UA[key]);
      expect(label).not.toContain('SM-A546B');
      expect(label).not.toContain('iPhone15');
      expect(label).not.toMatch(/samsung/i);
    }
  });
});

describe('describeDevice — планшеты', () => {
  it('отличает Android-планшет по отсутствию «Mobile»', () => {
    expect(describeDevice(UA.androidTabletChrome)).toBe('📱 Tablet Android · Chrome');
  });

  it('узнаёт iPad, когда о нём говорит приложение', () => {
    expect(describeDevice(UA.ipadInstagram)).toBe('📱 iPad · Instagram (app)');
  });

  // Известное ограничение: iPad в Safari шлёт ровно строку Mac, различить их
  // по заголовку нельзя.
  it('принимает iPad в Safari за Mac', () => {
    expect(describeDevice(UA.macSafari)).toBe('💻 Mac · Safari');
  });
});

describe('describeDevice — компьютеры', () => {
  it.each([
    ['windowsChrome', '💻 Windows · Chrome'],
    ['windowsEdge', '💻 Windows · Edge'],
    ['windowsFirefox', '💻 Windows · Firefox'],
    ['windowsOpera', '💻 Windows · Opera'],
    ['macSafari', '💻 Mac · Safari'],
    ['macChrome', '💻 Mac · Chrome'],
    ['chromeOS', '💻 ChromeOS · Chrome'],
    ['linuxFirefox', '💻 Linux · Firefox'],
  ])('%s → %s', (key, label) => {
    expect(describeDevice(UA[key])).toBe(label);
  });
});

describe('describeDevice — без устройства', () => {
  // Старые заявки хранились без заголовка: для них строки нет вовсе.
  it('молчит, когда заголовка нет', () => {
    expect(describeDevice(undefined)).toBe('');
    expect(describeDevice(null)).toBe('');
    expect(describeDevice('')).toBe('');
    expect(describeDevice('   ')).toBe('');
  });

  it('пишет «desconocido», когда заголовок не похож на браузер', () => {
    expect(describeDevice('curl/8.4.0')).toBe('desconocido');
    expect(describeDevice('python-requests/2.32.3')).toBe('desconocido');
  });
});

describe('cleanUserAgent', () => {
  it('обрезает пробелы и длину', () => {
    expect(cleanUserAgent(`  ${UA.macSafari}  `)).toBe(UA.macSafari);
    expect(cleanUserAgent('x'.repeat(5000))).toHaveLength(1000);
  });

  it('возвращает null, когда хранить нечего', () => {
    expect(cleanUserAgent(undefined)).toBeNull();
    expect(cleanUserAgent('')).toBeNull();
    expect(cleanUserAgent('   ')).toBeNull();
    expect(cleanUserAgent(['Mozilla/5.0'])).toBeNull();
  });
});
