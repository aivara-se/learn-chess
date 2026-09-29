/* The one place a lesson writes progress.
 *
 * `src/path/progress.js` reads the child's record and derives everything the map
 * and the header show from it; this is the other direction, and it is a module
 * of its own so that no screen handler writes a key by hand. Both files name the
 * key shape from the same place (`KEY` and `drillKey` are imported, not spelled
 * again), which is what keeps `#11`'s map and a lesson's stars from drifting
 * apart — the failure `docs/PORT.md` warns about, where two numbers that should
 * agree are maintained in two places.
 *
 * **A star is a first-try solve** — never for a puzzle solved after a wrong
 * answer or after a hint, and the caller is where that is decided, because only
 * the drill loop knows what the child did. This module writes what it is told
 * and nothing more: it cannot hand out a star, it can only record one.
 *
 * **The record is read, added to, and written back — it is not rebuilt.** A
 * returning visitor's record was written by the old app and holds fields this
 * build does not use (`sound`, `badges`, `daily`, `best`). `progress.read()`
 * normalises to the three lists it reads, so writing its answer back would
 * silently delete the rest; the raw object is what goes back to `localStorage`,
 * with only the two keys this module owns changed.
 */
import { KEY, drillKey, read } from '../path/progress.js';

/** The device's own storage, or `null` where there is none — private mode, a
 *  browser that refuses it, or a test that did not hand one in. */
export function deviceStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

const object = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

/**
 * Record that a drill's answer was found (or shown). `firstTry` is the star, and
 * it is the caller's call: a puzzle answered after a wrong move or after a hint
 * is solved, and it is not a star.
 *
 * Returns the normalised record as `src/path/progress.js` would read it, so the
 * screen can show the child their own stars without a second read, and `written`
 * — false when the storage refused the write, which is a child whose progress
 * does not stick rather than an error to throw at them.
 */
export function solve(unit, index, { firstTry = false, store = deviceStorage() } = {}) {
  if (!store) return { written: false, star: false, record: read(null) };

  let raw;
  try { raw = JSON.parse(store.getItem(KEY) ?? '{}'); } catch { raw = {}; }
  const draft = raw && typeof raw === 'object' ? raw : {};
  const key = drillKey(unit.id, index);

  draft.done = object(draft.done);
  draft.done[key] = true;
  const star = !!firstTry;
  if (star) {
    draft.first = object(draft.first);
    draft.first[key] = true;
  }

  try { store.setItem(KEY, JSON.stringify(draft)); } catch { return { written: false, star, record: read(store) }; }
  return { written: true, star, record: read(store) };
}
