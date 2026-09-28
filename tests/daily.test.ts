/* The daily puzzle's own rules — run with `bun test`.
 *
 * The daily is a promise about a date: the same day gives the same puzzle on
 * every device, the next day gives a different one, and nothing has to be stored
 * to make that true. These tests are that promise, checked without waiting for
 * tomorrow: the date is handed in, which is the whole reason js/daily.js takes
 * one rather than reading the clock.
 */
import { describe, expect, test } from 'bun:test';
import { LESSONS } from '../js/lessons.js';
import { dayNumber, dayStamp, dailyDrill, dailyIndex } from '../js/daily.js';

const drills: { key: string }[] = [];
LESSONS.forEach((l: any) => (l.drills || []).forEach((_: any, j: number) => drills.push({ key: `drill:${l.id}:${j}` })));

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0);

describe('the day', () => {
  test('is the reader\'s own date, not UTC\'s', () => {
    expect(dayStamp(at(2026, 9, 28))).toBe('2026-09-28');
    expect(dayNumber(at(2026, 9, 28))).toBe(dayNumber(at(2026, 9, 28, 23)));
    expect(dayNumber(at(2026, 9, 29))).toBe(dayNumber(at(2026, 9, 28)) + 1);
  });

  test('keeps counting across a month, a year and a leap day', () => {
    expect(dayNumber(at(2026, 9, 30)) + 1).toBe(dayNumber(at(2026, 10, 1)));
    expect(dayNumber(at(2026, 12, 31)) + 1).toBe(dayNumber(at(2027, 1, 1)));
    expect(dayNumber(at(2028, 2, 28)) + 1).toBe(dayNumber(at(2028, 2, 29)));
    expect(dayNumber(at(2028, 2, 29)) + 1).toBe(dayNumber(at(2028, 3, 1)));
  });
});

describe('the day\'s puzzle', () => {
  test('is the same however many times it is asked for', () => {
    const date = at(2026, 9, 28);
    expect(dailyDrill(date, drills)!.key).toBe(dailyDrill(date, drills)!.key);
    expect(dailyIndex(date, 26)).toBe(dailyIndex(date, 26));
    /* an hour later is the same day, and the same puzzle */
    expect(dailyIndex(at(2026, 9, 28, 23), 26)).toBe(dailyIndex(at(2026, 9, 28, 1), 26));
  });

  test('is a different one tomorrow', () => {
    const days = [...Array(60)].map((_, i) => new Date(2026, 8, 28 + i));
    for (let i = 1; i < days.length; i++) {
      expect(dailyIndex(days[i], drills.length)).not.toBe(dailyIndex(days[i - 1], drills.length));
    }
  });

  test('walks every puzzle once before it repeats any', () => {
    const n = drills.length;
    const seen = new Set([...Array(n)].map((_, i) => dailyIndex(new Date(2026, 8, 28 + i), n)));
    expect(seen.size).toBe(n);
  });

  test('answers with an entry of the list it was given, and nothing for an empty one', () => {
    const date = at(2026, 9, 28);
    const list = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
    expect(list).toContain(dailyDrill(date, list) as any);
    expect(dailyDrill(date, [])).toBeNull();
    expect(dailyIndex(date, 0)).toBe(-1);
    /* a list of one is not a crash, a division by nothing or a NaN */
    expect(dailyIndex(date, 1)).toBe(0);
    expect(dailyDrill(date, [{ key: 'only' }])!.key).toBe('only');
  });

  test('is derived, not drawn: the same date gives the same index on a fresh call', () => {
    /* the seed is the date and nothing else — no counter, no stored value */
    expect(dailyIndex(at(2026, 9, 28), 26)).toBe(dailyIndex(at(2026, 9, 28), 26));
    /* and a date it has never been asked about before still answers */
    expect(dailyIndex(at(1999, 1, 1), 26)).toBeGreaterThanOrEqual(0);
    expect(dailyIndex(at(2099, 12, 31), 26)).toBeLessThan(26);
  });
});
