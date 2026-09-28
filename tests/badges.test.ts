/* Rules tests for js/badges.js — run with `bun test`.
 *
 * The module holds no DOM and no storage of its own, so the rule that matters
 * is checkable here: a badge is handed out once and kept, the record holds the
 * best a child got (never less), and no count of the course is written down —
 * the one badge that asks for all the stars reads the total it is given.
 *
 * The store is a plain object in a closure, the same shape as the app's own
 * `localStorage` record: `{ done, first, best }` and, now, `badges`.
 */
import { describe, expect, test } from 'bun:test';
import { BADGES, createBook } from '../js/badges.js';

const TOTAL_STARS = 26;

/* A stand-in for the app's progress store, holding the keys it already keeps —
   so a badge write can be shown not to lose them. */
function memory(initial: any = {}) {
  let data: any = initial;
  return {
    read: () => data,
    write: (d: any) => { data = d; },
    dump: () => data,
  };
}

const book = (store = memory(), totals: any = { stars: TOTAL_STARS }) =>
  createBook({ read: store.read, write: store.write, totals });

describe('the badge list', () => {
  test('every badge names itself, says how it is earned, and asks for a count', () => {
    for (const badge of BADGES) {
      expect(badge.id).toMatch(/^[a-z0-9-]+$/);
      expect(badge.name.length).toBeGreaterThan(0);
      expect(badge.what.length).toBeGreaterThan(0);
      expect(badge.unit.length).toBeGreaterThan(0);
      expect(typeof badge.of === 'function' || badge.of > 0).toBe(true);
    }
  });

  test('ids are unique, so a badge cannot be counted as another', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });

  test('only the all-the-stars badge depends on the totals the app passes in', () => {
    const fromTotals = BADGES.filter((b) => typeof b.of === 'function');
    expect(fromTotals.map((b) => b.id)).toEqual(['all-stars']);
  });
});

describe('note', () => {
  test('answers the badge at the moment it is earned, and null every time after', () => {
    const b = book();
    expect(b.note('first-win')).toEqual(BADGES.find((x) => x.id === 'first-win'));
    expect(b.note('first-win')).toBe(null);
    expect(b.note('first-win')).toBe(null);
    expect(b.value('first-win')).toBe(1);
  });

  test('a count has to reach what the badge asks for before it is handed out', () => {
    const b = book();
    for (const run of [1, 2, 3, 4]) expect(b.note('streak-5', run)).toBe(null);
    expect(b.note('streak-5', 5)).toEqual(BADGES.find((x) => x.id === 'streak-5'));
    expect(b.note('streak-5', 6)).toBe(null);
  });

  test('the record keeps the best a child got, it never goes backwards', () => {
    const b = book();
    b.note('streak-5', 5);
    expect(b.note('streak-5', 2)).toBe(null);
    expect(b.value('streak-5')).toBe(5);
  });

  test('all the stars is measured against the course the app counted, not a written-down total', () => {
    const short = book(memory(), { stars: 3 });
    expect(short.note('all-stars', 2)).toBe(null);
    expect(short.note('all-stars', 3)).toEqual(BADGES.find((x) => x.id === 'all-stars'));
  });

  test('a badge write keeps the progress the app already had', () => {
    const store = memory({ done: { 'drill:board-and-pieces:0': true }, first: {}, best: 4 });
    book(store).note('first-game');
    expect(store.dump()).toEqual({
      done: { 'drill:board-and-pieces:0': true },
      first: {},
      best: 4,
      badges: { 'first-game': 1 },
    });
  });

  test('an id no badge carries is a mistake, and is thrown rather than swallowed', () => {
    expect(() => book().note('win-level-4')).toThrow('no badge called "win-level-4"');
  });
});

describe('shelf', () => {
  test('a fresh install has nothing earned, and the nearest badge is offered first', () => {
    const shelf = book().shelf();
    expect(shelf.earned).toEqual([]);
    expect(shelf.total).toBe(BADGES.length);
    expect(shelf.next.badge.id).toBe('first-game');
    expect(shelf.next.need).toBe(1);
    expect(shelf.locked.length).toBe(BADGES.length - 1);
  });

  test('earned badges come first, in the list order', () => {
    const b = book();
    b.note('castle');
    b.note('first-game');
    const shelf = b.shelf();
    expect(shelf.earned.map((s) => s.badge.id)).toEqual(['first-game', 'castle']);
  });

  test('the badge nearest to being earned is the one with the fewest left', () => {
    const b = book();
    /* Everything but these two is a single moment, and already had. */
    for (const badge of BADGES) {
      if (!['streak-5', 'all-stars'].includes(badge.id)) b.note(badge.id);
    }
    b.note('streak-5', 4);          // one first-try answer short
    b.note('all-stars', 2);         // most of the course short
    expect(b.shelf().next.badge.id).toBe('streak-5');
    expect(b.shelf().next.need).toBe(1);
    expect(b.shelf().locked.map((s) => s.badge.id)).toEqual(['all-stars']);
  });

  test('an earned badge keeps its own count, and the shelf reports how far it got', () => {
    const b = book();
    b.note('all-stars', TOTAL_STARS);
    const earned = b.shelf().earned;
    expect(earned.map((s) => s.badge.id)).toEqual(['all-stars']);
    expect(earned[0].have).toBe(TOTAL_STARS);
    expect(earned[0].of).toBe(TOTAL_STARS);
    expect(earned[0].need).toBe(0);
  });
});
