import { describe, it, expect } from 'vitest';
import { headingId, renderGuideMarkdown } from './markdown.js';

const html = (source, lang) => renderGuideMarkdown(source, lang).html;

describe('renderGuideMarkdown', () => {
  // The text is typed in /admin: markup in it is shown, never run.
  it('shows raw HTML as text', () => {
    const out = html('Hola <script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;');
  });

  it('refuses script links', () => {
    expect(html('[x](javascript:alert(1))')).not.toContain('href="javascript');
  });

  it('turns the "##" sections into the table of contents, each heading with its id', () => {
    const { html: out, toc } = renderGuideMarkdown(
      '## ¿Qué fondo debe tener un tocador?\n\nTexto.\n\n### Detalle\n\n## Medidas de un tocador Hollywood',
    );
    expect(out).toContain('<h2 id="que-fondo-debe-tener-un-tocador">');
    expect(out).toContain('<h3>Detalle</h3>');
    expect(toc).toEqual([
      { id: 'que-fondo-debe-tener-un-tocador', text: '¿Qué fondo debe tener un tocador?' },
      { id: 'medidas-de-un-tocador-hollywood', text: 'Medidas de un tocador Hollywood' },
    ]);
  });

  // The page has the one <h1>.
  it('makes a "#" heading a section and folds deeper ones into "###"', () => {
    const out = html('# Uno\n\n#### Dos');
    expect(out).toContain('<h2 id="uno">Uno</h2>');
    expect(out).toContain('<h3>Dos</h3>');
    expect(out).not.toMatch(/<h[14]/);
  });

  it('gives repeated headings ids of their own', () => {
    const { toc } = renderGuideMarkdown('## Altura\n\n## Altura');
    expect(toc.map((item) => item.id)).toEqual(['altura', 'altura-2']);
  });

  it('starts every render with an empty table of contents', () => {
    renderGuideMarkdown('## Uno');
    expect(renderGuideMarkdown('Sin secciones').toc).toEqual([]);
  });

  it('sends the English text to the English pages', () => {
    const out = html(
      '[a](/tocadores/Tocador-L-01) [b](/en/espejos) [c](/guias/medidas-tocador)',
      'en',
    );
    expect(out).toContain('href="/en/tocadores/Tocador-L-01"');
    expect(out).toContain('href="/en/espejos"');
    expect(out).toContain('href="/en/guias/medidas-tocador"');
  });

  it('leaves the Spanish links as they are', () => {
    expect(html('[a](/tocadores/Tocador-L-01)', 'es')).toContain('href="/tocadores/Tocador-L-01"');
  });

  it('opens other sites in a new tab without handing them this one', () => {
    expect(html('[a](https://example.com)')).toContain(
      'href="https://example.com" target="_blank" rel="noopener noreferrer"',
    );
  });

  it('serves an uploaded photo in its pre-made sizes, lazily, keeping its alt', () => {
    const out = html('![Tocador blanco](/uploads/abc.jpg)');
    expect(out).toContain('src="/uploads/abc_800.webp"');
    expect(out).toContain('alt="Tocador blanco"');
    expect(out).toContain('srcset="/uploads/abc_400.webp 400w');
    expect(out).toContain('loading="lazy"');
  });

  it('wraps a table so it scrolls on a phone instead of the page', () => {
    expect(html('| A | B |\n|---|---|\n| 1 | 2 |')).toMatch(
      /^<div class="guide-table"><table>[\s\S]*<\/table><\/div>/,
    );
  });

  it('copes with no text', () => {
    expect(renderGuideMarkdown(undefined)).toEqual({ html: '', toc: [] });
  });
});

describe('headingId', () => {
  it('drops accents, punctuation and case', () => {
    expect(headingId('¿Cuál es la altura estándar de un tocador?')).toBe(
      'cual-es-la-altura-estandar-de-un-tocador',
    );
  });
});
