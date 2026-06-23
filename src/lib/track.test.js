import { describe, it, expect, vi, afterEach } from 'vitest';
import { trackPixel } from './track.js';

afterEach(() => {
  delete window.fbq;
});

describe('trackPixel', () => {
  it('forwards event + params to window.fbq', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackPixel('Lead', { content_name: 'Tocador T-20' });
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', { content_name: 'Tocador T-20' });
  });

  it('passes the event through with no params', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackPixel('PageView');
    expect(fbq).toHaveBeenCalledWith('track', 'PageView', undefined);
  });

  it('is a no-op (does not throw) when fbq is absent', () => {
    delete window.fbq;
    expect(() => trackPixel('ViewContent', { content_ids: ['x'] })).not.toThrow();
  });
});
