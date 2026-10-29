import { describe, expect, it } from 'vitest';
import {
  brokenProductLinks,
  keywordCoverage,
  missingLines,
  serviceMentions,
} from './guideChecks.js';

const full = { title: 'T', description: 'D', answer: 'A', body: 'B', faq: [] };

describe('missingLines', () => {
  it('says nothing of a complete article', () => {
    expect(missingLines({ es: full, en: full })).toEqual([]);
  });

  it('lists what each language lacks, in Russian', () => {
    expect(
      missingLines({
        es: { ...full, faq: [{ q: '¿Algo?', a: '' }] },
        en: { title: 'T', description: '', answer: '', body: '', faq: [] },
      }),
    ).toEqual([
      'испанский: вопрос 1 без ответа или ответ без вопроса',
      'английский: описание для Google, короткий ответ, текст',
    ]);
  });
});

describe('keywordCoverage', () => {
  it('finds a search in the title, the description and the short answer, accents and case aside', () => {
    expect(
      keywordCoverage({
        title: 'Tocador PEQUEÑO: medidas',
        description: 'Un tocador pequeno cabe en todo dormitorio.',
        answer: 'Depende del espacio.',
        keywords: ['tocador pequeño', 'tocador  estrecho'],
      }),
    ).toEqual([
      { keyword: 'tocador pequeño', title: true, description: true, answer: false },
      { keyword: 'tocador  estrecho', title: false, description: false, answer: false },
    ]);
  });

  it('has nothing to say without searches', () => {
    expect(keywordCoverage({ title: 'T' })).toEqual([]);
  });
});

describe('serviceMentions', () => {
  it('finds the words about delivery, assembly and returns, in text and questions', () => {
    const block = {
      title: 'Medidas',
      body: 'El envío es rápido y el montaje está incluido.',
      faq: [{ q: '¿Devolución?', a: 'Sí.' }],
    };
    expect(serviceMentions(block, 'es')).toEqual(['envío', 'montaje', 'devolución']);
  });

  it('matches whole words only', () => {
    expect(serviceMentions({ body: 'Entregado al cliente, reenvíos.' }, 'es')).toEqual([]);
  });

  it('looks for the English words in the English text', () => {
    expect(serviceMentions({ body: 'Free shipping.' }, 'en')).toEqual(['shipping']);
    expect(serviceMentions({ body: 'Free shipping.' }, 'es')).toEqual([]);
  });
});

describe('brokenProductLinks', () => {
  const categories = [
    {
      slug: 'tocadores',
      products: [
        { id: 'T-1' },
        { id: 'T-OFF', visibility: 'off' },
        { id: 'T-HID', visibility: 'unlisted' },
      ],
    },
    { slug: 'espejos', products: [{ id: 'E-1' }] },
  ];
  const why = (body) => brokenProductLinks(body, categories).map((l) => l.why);

  it('passes a link to a model on the site', () => {
    expect(why('[a](/tocadores/T-1) [b](/en/espejos/E-1)')).toEqual([]);
  });

  it('flags a model that is gone, off, moved or hidden', () => {
    expect(why('[a](/tocadores/NOPE)')).toEqual(['такого товара нет в каталоге']);
    expect(why('[a](/tocadores/T-OFF)')).toEqual(['товар снят с сайта']);
    expect(why('[a](/espejos/T-1)')).toEqual(['товар теперь в разделе «tocadores»']);
    expect(why('[a](/tocadores/T-HID)')[0]).toMatch(/скрыт из списков/);
  });

  it('leaves alone links to guides and to section pages', () => {
    expect(why('[a](/guias/medidas-tocador) [b](/tocadores)')).toEqual([]);
  });
});
