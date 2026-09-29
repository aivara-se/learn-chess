/* The child's progress, and what the map reads off it.
 *
 * The record is v1's, carried over whole on purpose: the same key
 * (`aivara-learn-chess-v2`), the same three lists (`done`, `first`, `boss`) and
 * the same key strings (`drill:<stop id>:<n>`, `boss:<level>`). That is measured
 * rather than assumed — the ported course has the same stop ids, the same drill
 * order and the same FEN in every position as the app it replaces, so a key the
 * old app wrote still names the puzzle the child solved and nothing is silently
 * re-attributed to a different position. A child who was halfway through before
 * the rebuild opens this one with their stars where they left them.
 *
 * **Nothing here writes.** Reading is the whole of this card's business with the
 * record: everything the map shows — which stop is open, which is done, how many
 * stars a stop earned, what is left to the next rank — is derived from it, and a
 * map that could write progress it did not measure is a map that could hand out a
 * star. The screens that play a puzzle record into the same shape when they land;
 * this file is what they and the map agree on.
 *
 * `read()` takes the storage as an argument with the device's own as the default,
 * which is what lets `tests/path.test.ts` hand it a plain object and check the
 * derivation with no browser at all.
 */
import { LESSONS, PACKS } from '../data/lessons.js';

export const KEY = 'aivara-learn-chess-v2';

/* Every stop on the map in one list: on the screen a lesson, a boss game and a
 * detour are the same thing — a stop with a name and a state — and the packs are
 * the ones nothing requires. */
export const stops = [...LESSONS, ...PACKS];
export const byId = new Map(stops.map((stop) => [stop.id, stop]));
/* The size of the course, counted from the course. A total written into a file is
 * a lie waiting to happen; `scripts/verify-site.ts` fails one. */
export const totalDrills = stops.reduce((n, stop) => n + (stop.drills ?? []).length, 0);

/* Stars become a rank, and the rank is a piece whose reach they have earned: a
 * child who has won five stars is a knight, not "level 2". The rungs are v1's,
 * verbatim — set against the course's own puzzle pool, a rung every six or seven
 * stars with King still short of the last one, and `docs/PORT.md` is where the
 * reasoning is written down. */
export const ranks = [['Pawn', 0], ['Knight', 6], ['Bishop', 13], ['Rook', 18], ['Queen', 23], ['King', 29]];

export const drillKey = (id, index) => `drill:${id}:${index}`;
/* A boss win is recorded under the bare level — `{"3": true}`. That is what v1's code
 * actually wrote, whatever its own comment claimed the key looked like, and the
 * reader is the wire format: it takes `Number(key)`, so a key spelled `boss:3` would
 * be `NaN` and every boss stop would go on reading unwon. The shape is carried over
 * as the old app wrote it, or a child's boss wins do not survive the rebuild. */
export const bossKey = (level) => String(level);

export const blank = () => ({ done: {}, first: {}, boss: {} });

const list = (value) => (value && typeof value === 'object' ? value : {});

export function read(store = deviceStorage()) {
  if (!store) return blank();
  try {
    const found = JSON.parse(store.getItem(KEY) ?? '{}');
    const record = found && typeof found === 'object' ? found : {};
    return { done: list(record.done), first: list(record.first), boss: list(record.boss) };
  } catch {
    /* Junk in this key, or a storage that refuses to be read: a child with no
     * progress starts at the top of the path rather than at an error. */
    return blank();
  }
}

function deviceStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export const solved = (record, key) => !!record.done[key];
export const firstTry = (record, key) => !!record.first[key];

/* A stop's own puzzles, counted from the keys they are recorded under rather
 * than from a number kept beside them: `solved` is a puzzle whose answer was
 * found or shown, `stars` is the ones solved first time, and the two must stay
 * separate — a star means first try. */
export function puzzles(record, unit) {
  const drills = unit.drills ?? [];
  return {
    of: drills.length,
    solved: drills.filter((_, i) => solved(record, drillKey(unit.id, i))).length,
    stars: drills.filter((_, i) => firstTry(record, drillKey(unit.id, i))).length,
  };
}

/* A stop whose boss has been beaten at its level or a harder one is finished: a
 * child who has already won against a stronger Pip does not have to prove it
 * again at the easier one. */
export const bossBeaten = (record, stop) =>
  Object.keys(record.boss).some((level) => Number(level) >= stop.boss.level);

/* A lesson is finished when every puzzle in it is solved; a boss stop has no
 * puzzles and is finished by the game; a pack is finished like a lesson. */
export const finished = (record, unit) => (unit.boss
  ? bossBeaten(record, unit)
  : (unit.drills ?? []).every((_, i) => solved(record, drillKey(unit.id, i))));

/* A lesson is open when everything it requires is finished; a pack is open when
 * the lesson that teaches its idea is — and nothing requires a pack, which is the
 * whole of what "optional" means here. */
export const open = (record, unit) => (unit.opensWith
  ? finished(record, byId.get(unit.opensWith))
  : (unit.requires ?? []).every((id) => finished(record, byId.get(id))));

export const state = (record, unit) => (finished(record, unit) ? 'done' : open(record, unit) ? 'open' : 'locked');

/* The one thing still holding a stop shut — the lesson a locked stop says out
 * loud, and the lesson whose finish opens it. `null` when nothing holds it. */
export const heldBy = (record, unit) => (unit.opensWith
  ? (finished(record, byId.get(unit.opensWith)) ? null : unit.opensWith)
  : (unit.requires ?? []).find((id) => !finished(record, byId.get(id))) ?? null);

/* Where the child is now: the first stop that is open and not finished. Once the
 * whole path is walked there is nowhere left to be, and the map says so rather
 * than marking a stop that is done. */
export const here = (record) => LESSONS.find((lesson) => open(record, lesson) && !finished(record, lesson)) ?? null;

/* Both numbers, kept apart the way the course keeps them: a puzzle solved, and a
 * star for the ones solved first time. */
export const counts = (record) => ({
  solved: stops.reduce((n, stop) => n + puzzles(record, stop).solved, 0),
  stars: stops.reduce((n, stop) => n + puzzles(record, stop).stars, 0),
  of: totalDrills,
});

export function rank(stars) {
  let at = 0;
  while (at + 1 < ranks.length && stars >= ranks[at + 1][1]) at += 1;
  const next = ranks[at + 1] ?? null;
  return {
    name: ranks[at][0],
    from: ranks[at][1],
    to: next ? next[1] : totalDrills,
    next: next ? next[0] : null,
    need: next ? next[1] - stars : 0,
    stars,
  };
}
