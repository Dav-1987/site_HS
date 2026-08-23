import { describe, expect, it } from 'vitest';
import { shareDescription } from '../seo/description.js';

describe('shareDescription', () => {
  it('keeps the line breaks an admin typed on purpose', () => {
    expect(shareDescription('Muebles modernos\nEnvío gratis')).toBe('Muebles modernos\nEnvío gratis');
  });

  it('collapses wrapped and indented JSX copy without eating the breaks', () => {
    expect(shareDescription('Tocadores   y\t espejos \n   Montaje gratis')).toBe(
      'Tocadores y espejos\nMontaje gratis',
    );
  });

  it('caps a run of blank lines at one', () => {
    expect(shareDescription('Primera\n\n\n\nSegunda')).toBe('Primera\n\nSegunda');
  });

  it('normalizes Windows line endings', () => {
    expect(shareDescription('Primera\r\nSegunda')).toBe('Primera\nSegunda');
  });

  it('trims the whole string and every line', () => {
    expect(shareDescription('  Primera  \n  Segunda  \n ')).toBe('Primera\nSegunda');
  });

  it('returns undefined for missing or blank copy so the tag is omitted', () => {
    expect(shareDescription(undefined)).toBeUndefined();
    expect(shareDescription('')).toBeUndefined();
    expect(shareDescription('   \n  ')).toBeUndefined();
  });
});
