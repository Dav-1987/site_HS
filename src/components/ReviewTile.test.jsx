import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import ReviewTile from './ReviewTile.jsx';

function renderTile(review, { index = 0, onOpen = () => {} } = {}) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <ReviewTile review={review} index={index} onOpen={onOpen} />
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('ReviewTile', () => {
  it('renders a screenshot through the WebP variants', () => {
    const { container } = renderTile({ image: '/uploads/abc.png' });
    const img = container.querySelector('img');
    // resolveImage rewrites an /uploads/ path to the generated variant — the
    // original PNG is deleted on upload for reviews, so asking for it 404s.
    expect(img.getAttribute('src')).toContain('_800.webp');
    expect(img.getAttribute('src')).not.toContain('.png');
  });

  it('points a clip at the poster derived from its own path', () => {
    const { container } = renderTile({ video: '/uploads/abc.mp4' });
    const video = container.querySelector('video');
    expect(video.getAttribute('src')).toBe('/uploads/abc.mp4');
    expect(video.getAttribute('poster')).toContain('abc_poster');
  });

  // Стена из десятка роликов, качающихся разом, — это мегабайты в секунду на
  // телефоне. Загрузка откладывается до попадания во вьюпорт.
  it('does not preload a clip before it is on screen', () => {
    const { container } = renderTile({ video: '/uploads/abc.mp4' });
    expect(container.querySelector('video').getAttribute('preload')).toBe('none');
  });

  it('keeps a clip muted and inline so autoplay is allowed at all', () => {
    const { container } = renderTile({ video: '/uploads/abc.mp4' });
    const video = container.querySelector('video');
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.hasAttribute('loop')).toBe(true);
  });

  it('names the tile for screen readers, numbered so they are told apart', () => {
    renderTile({ image: '/uploads/abc.png' }, { index: 2 });
    expect(screen.getByRole('button', { name: 'Opinión de cliente 3' })).toBeTruthy();
  });

  it('opens the lightbox at its own position', () => {
    const onOpen = vi.fn();
    renderTile({ image: '/uploads/abc.png' }, { index: 4, onOpen });
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(4);
  });

  it('marks a clip visually so it is not mistaken for a screenshot while paused', () => {
    const { container } = renderTile({ video: '/uploads/abc.mp4' });
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
