import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const [, endText, script] = html.match(
  /<script id="black-friday-schedule" data-end="([^"]+)">([\s\S]*?)<\/script>/,
);
const end = Date.parse(endText);

function runSchedule(initialTime) {
  let now = initialTime;
  let scheduled;
  const classes = new Set();
  const theme = { content: '#F7F5F2' };
  const document = {
    currentScript: { dataset: { end: endText } },
    documentElement: {
      classList: {
        toggle(name, active) {
          if (active) classes.add(name);
          else classes.delete(name);
        },
      },
    },
    querySelector: () => theme,
    addEventListener: () => {},
  };
  const window = { setTimeout: (callback, delay) => (scheduled = { callback, delay }) };
  runInNewContext(script, { document, window, Date: { parse: Date.parse, now: () => now } });
  return {
    classes,
    theme,
    get scheduled() {
      return scheduled;
    },
    advanceTo(time) {
      now = time;
      scheduled.callback();
    },
  };
}

describe('Black Friday schedule', () => {
  it('uses Madrid midnight on 1 December 2026', () => {
    expect(endText).toBe('2026-12-01T00:00:00+01:00');
    expect(new Date(end).toISOString()).toBe('2026-11-30T23:00:00.000Z');
  });

  it('removes the theme at the deadline in an open tab', () => {
    const state = runSchedule(end - 1000);
    expect(state.classes.has('black-friday')).toBe(true);
    expect(state.scheduled.delay).toBe(1010);
    state.advanceTo(end);
    expect(state.classes.has('black-friday')).toBe(false);
    expect(state.theme.content).toBe('#F7F5F2');
  });

  it('starts with the ordinary theme after the deadline', () => {
    const state = runSchedule(end);
    expect(state.classes.has('black-friday')).toBe(false);
    expect(state.scheduled).toBeUndefined();
  });
});
