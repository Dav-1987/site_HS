// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Guards two rules over the admin's own source, so they hold without anyone
// having to remember them:
//
// - only the site's palette (CLAUDE.md: "Don't use default Tailwind colors") —
//   errors are `danger`, warnings `accent-text`, never red-600 or amber-700;
// - text dark enough to read: `text-primary` lighter than 70% fails WCAG AA as
//   small text (45% is 2.6:1 on the page). The one exception is decoration
//   hidden from screen readers — the «M» on a thumbnail with no photo.

const ROOT = join(import.meta.dirname, '.');

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(jsx?|mjs)$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
  });
}

const FILES = sources(ROOT).map((path) => ({
  path: path.slice(ROOT.length + 1),
  lines: readFileSync(path, 'utf8').split('\n'),
}));

const offending = (test) =>
  FILES.flatMap(({ path, lines }) =>
    lines.flatMap((line, i) => (test(line) ? [`${path}:${i + 1}  ${line.trim()}`] : [])),
  );

describe('admin palette', () => {
  it('reads every file it guards', () => {
    expect(FILES.length).toBeGreaterThan(40);
  });

  it('uses no default Tailwind colours', () => {
    const DEFAULT_COLOUR =
      /\b(?:text|bg|border|ring|outline|accent|fill|stroke|from|to|via)-(?:red|amber|orange|yellow|green|emerald|teal|blue|indigo|violet|purple|pink|rose|gray|slate|zinc|neutral|stone)-\d{2,3}\b/;
    expect(offending((line) => DEFAULT_COLOUR.test(line))).toEqual([]);
  });

  it('keeps text at 70% ink or darker, decoration aside', () => {
    const FAINT_TEXT = /\btext-primary\/([1-6]\d|[1-9])\b/;
    expect(
      offending((line) => FAINT_TEXT.test(line) && !line.includes('aria-hidden="true"')),
    ).toEqual([]);
  });
});
