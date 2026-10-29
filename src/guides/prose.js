// How an article's text is styled — on its page and in the admin's preview,
// which must look the same. The text arrives as HTML (src/guides/markdown.js),
// so it is styled from its container: headings, lists, tables and links as the
// rest of the site sets them.
export const GUIDE_PROSE = [
  'text-[0.95rem] leading-relaxed text-secondary md:text-base',
  '[&_h2]:mb-5 [&_h2]:mt-14 [&_h2]:scroll-mt-28 [&_h2]:font-serif [&_h2]:text-[clamp(1.6rem,2.6vw,2.1rem)] [&_h2]:font-light [&_h2]:leading-tight [&_h2]:tracking-tight [&_h2]:text-primary',
  '[&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-normal [&_h3]:text-primary',
  '[&_p]:mt-4',
  '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5',
  '[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5',
  '[&_strong]:font-medium [&_strong]:text-primary',
  '[&_a]:text-accent-text [&_a]:underline [&_a]:decoration-accent/40 [&_a]:underline-offset-4 [&_a:hover]:decoration-accent',
  '[&_.guide-table]:mt-6 [&_.guide-table]:overflow-x-auto',
  '[&_table]:w-full [&_table]:min-w-[32rem] [&_table]:border-collapse [&_table]:text-sm',
  '[&_th]:border-b [&_th]:border-primary/20 [&_th]:py-3 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_th]:text-primary',
  '[&_td]:border-b [&_td]:border-primary/10 [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top',
  // The first column is the measure itself ("50–60 cm"): never split in two.
  '[&_td:first-child]:whitespace-nowrap [&_th:first-child]:whitespace-nowrap',
  '[&_img]:mt-6 [&_img]:w-full',
  '[&_blockquote]:mt-6 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-5 [&_blockquote]:text-primary/80',
].join(' ');
