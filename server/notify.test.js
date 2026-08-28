import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatOrderText } from './order.js';
import { sendTelegram } from './notify.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Telegram order notification', () => {
  it('sends the delivery country and canonical international phone', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('TELEGRAM_CHAT_ID', '12345');
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const text = formatOrderText({
      name: 'Marie Dupont',
      phone: '+37499123456',
      country: 'FR',
      postalCode: '75001',
      productName: 'Tocador Aria',
      productId: 'p1',
    });
    await sendTelegram(text);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottest-token/sendMessage');
    expect(JSON.parse(options.body)).toMatchObject({
      chat_id: '12345',
      text: expect.stringContaining('País: Francia (FR)'),
    });
    expect(JSON.parse(options.body).text).toContain('Teléfono: +37499123456');
  });
});
