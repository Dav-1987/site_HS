import { describe, expect, it } from 'vitest';
import { withGuides } from './generate-llms.mjs';

const guide = (slug) => ({
  slug,
  es: { title: `Título ${slug}`, description: `Descripción ${slug}` },
  en: { title: `Title ${slug}`, description: `Description ${slug}` },
});

describe('withGuides', () => {
  const base =
    '# Mirage Muebles\n\n## Productos\n\n- [Tocadores](https://hsmuebles.es/tocadores)\n';

  it('adds a list per language after the hand-written part', () => {
    const out = withGuides(base, [guide('medidas-tocador')]);
    expect(out.startsWith(base.trimEnd())).toBe(true);
    expect(out).toContain(
      '## Guías\n\n- [Todas las guías](https://hsmuebles.es/guias)\n- [Título medidas-tocador](https://hsmuebles.es/guias/medidas-tocador): Descripción medidas-tocador',
    );
    expect(out).toContain(
      '- [Title medidas-tocador](https://hsmuebles.es/en/guias/medidas-tocador): Description medidas-tocador',
    );
    expect(out.endsWith('\n')).toBe(true);
  });

  it('leaves the file alone while nothing is published', () => {
    expect(withGuides(base, [])).toBe(base);
  });
});
