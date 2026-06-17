/**
 * Emits one <script type="application/ld+json"> with the given schema object
 * (or array of objects). Rendered inline — JSON-LD is valid anywhere in the
 * document and the prerenderer keeps it in the page body, where crawlers and
 * AI engines read it.
 */
export default function JsonLd({ data }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
