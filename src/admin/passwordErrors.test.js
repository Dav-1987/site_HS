import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERVER_ERRORS, passwordErrorText } from './passwordErrors.js';

describe('passwordErrorText', () => {
  it('only translates what the server really says', () => {
    const server = ['../../server/auth.js', '../../server/index.js']
      .map((p) => readFileSync(new URL(p, import.meta.url), 'utf8'))
      .join('\n');
    const gone = Object.keys(SERVER_ERRORS).filter((m) => !server.includes(`'${m}'`));
    expect(gone).toEqual([]);
  });

  it('translates what the server says about a wrong password', () => {
    expect(passwordErrorText('Incorrect password', 'x')).toBe('Неверный пароль');
    expect(passwordErrorText('Too many login attempts, try again in a minute', 'x')).toMatch(
      /Подождите минуту/,
    );
  });

  it('keeps a message it does not know', () => {
    expect(passwordErrorText('Ошибка запроса (502)', 'x')).toBe('Ошибка запроса (502)');
  });

  it('falls back when there is no message at all', () => {
    expect(passwordErrorText('', 'Ошибка входа')).toBe('Ошибка входа');
    expect(passwordErrorText(undefined, 'Ошибка входа')).toBe('Ошибка входа');
  });
});
