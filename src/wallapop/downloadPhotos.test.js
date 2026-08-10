import { describe, expect, it } from 'vitest';
import { photoExtension, photoFilename, wallapopMediaUrl, zipFilename } from './downloadPhotos.js';

describe('Wallapop ZIP photo naming', () => {
  it('keeps the image extension and creates ordered safe filenames', () => {
    const record = { productId: 'Tocador L/11', reference: 'L 11' };
    expect(photoFilename(record, 0, '/uploads/photo.JPG')).toBe('01-L-11.jpg');
    expect(photoFilename(record, 9, 'https://example.com/image.webp?size=full')).toBe(
      '10-L-11.webp',
    );
  });

  it('falls back to jpg for URLs without an extension', () => {
    expect(photoExtension('/image')).toBe('.jpg');
  });

  it('names the ZIP archive with the product reference', () => {
    expect(zipFilename({ productId: 'Tocador-L-11', reference: 'L-11' })).toBe('L-11.zip');
    expect(zipFilename({ productId: 'Tocador L/11' })).toBe('Tocador-L-11.zip');
  });

  it('resolves catalog upload paths through the canonical HTTPS site', () => {
    expect(wallapopMediaUrl('/uploads/photo.jpg')).toBe('https://hsmuebles.es/uploads/photo.jpg');
    expect(wallapopMediaUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
  });
});
