/* The map's geometry — where every stop stands, derived from the graph.
 *
 * Nothing about the order is written down: a stop's row is how far down the path
 * it is (the longest chain of `requires` behind it, so a stop is never drawn above
 * the lesson it needs) and its column is how many stops share that row. That is
 * the old rule and it is not a stylistic one: a hand-placed coordinate table is a
 * lie that drifts the first time a lesson is added, and the picture of the course
 * would go on being wrong quietly.
 *
 * The layout is pure geometry — it takes a width and returns stops, legs and a
 * height, and knows nothing about a child's progress. That is what lets
 * `tests/path.test.ts` check the card's rendering rule with no browser: every stop
 * the graph has is placed exactly once, and no stop is placed that the graph does
 * not have. `src/scenes/path.js` draws what this returns and asks
 * `src/path/progress.js` what state each stop is in.
 *
 * A pack hangs off the lesson that teaches its idea: it stands in that lesson's
 * own row, in a column the row has left free, so it reads as a detour beside the
 * path rather than a stop on it — no leg runs through it and nothing depends on
 * it. A row of three lessons plus their packs would have no free column;
 * `scripts/verify-site.ts` fails that course rather than this file drawing a stop
 * somewhere it cannot be seen, and `slip` below is the shape it would take.
 */
import { LESSONS, PACKS } from '../data/lessons.js';

/* What a finger gets: a stop's own circle, and a detour's, exactly as the port
 * contract sets them (a stop is 64, a pack is the 48px floor itself). */
export const SIZE = { lesson: 64, boss: 64, pack: 48 };

export const ROW = 152;          // one row of the map: a stop, its caption and a gap
/* Where the first row's stop stands. The first stop on the path is the one the child
 * is on, so the room above it is Pip's, not the margin's: he stands above the circle
 * and would otherwise be behind the header on a fresh device. */
export const TOP = 66;
const COLUMN = [0.19, 0.5, 0.81]; // the three columns, as a share of the map's width
const SLIP = 84;                 // where a pack goes when its row has no column free
/* Between two neighbouring stops' captions. `src/path/place.js` draws the clear
 * ground between any two stops' boxes with it, so the two rules agree. */
export const GUTTER = 6;
/* The room under the last stop for its caption, its stars and a margin. The
 * screen measures what it really drew and takes the larger of the two, so a
 * longer caption can grow the map but nothing can be cut off by a constant. */
export const FOOTING = 104;

/* A caption is as wide as the space one column has between its neighbours, so two
 * captions can never touch and no caption can run off the map. The scene draws to
 * this and `tests/path.test.ts` holds both ends of it. */
export const captionWidth = (mapWidth) => Math.max(60, Math.round(0.31 * mapWidth) - GUTTER);
/* The narrowest room a row ever leaves a caption: three stops across the map. The room
 * a stop really gets is `stop.caption`, which is wider wherever its row has the space. */
const MIN_CAPTION = 60;
const MARGIN = 6;                // the map's own edge, which no caption crosses

/* How far down the path a lesson is. `seen` stops a course that goes in a circle
 * from hanging the renderer — `scripts/verify-site.ts` is what fails one. */
export function depth(lesson, seen = new Set()) {
  const requires = lesson.requires ?? [];
  if (!requires.length || seen.has(lesson.id)) return 0;
  seen.add(lesson.id);
  return 1 + Math.max(...requires.map((id) => depth(LESSONS.find((l) => l.id === id), seen)));
}

const kind = (unit) => (unit.opensWith ? 'pack' : unit.boss ? 'boss' : 'lesson');

let cache = null;

/* One layout per width: the map is rebuilt when the viewport changes and not
 * once per frame. `width` is the map's own width, not the window's — the screen
 * caps it and centres it. */
export function layout(width) {
  if (cache && cache.width === width) return cache;

  const rows = new Map();
  for (const lesson of LESSONS) {
    const at = depth(lesson);
    if (!rows.has(at)) rows.set(at, []);
    rows.get(at).push(lesson);
  }

  const placed = new Map();
  for (const [at, group] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    /* One stop sits in the middle, a fork puts its two branches left and right,
     * so the route winds and the picture cannot drift away from the course. */
    const columns = group.length === 1 ? [1] : group.length === 2 ? [0, 2] : [0, 1, 2];
    group.forEach((lesson, i) => {
      placed.set(lesson.id, { unit: lesson, at, column: columns[Math.min(i, columns.length - 1)], y: TOP + at * ROW, slip: false });
    });

    const taken = new Set(columns);
    for (const pack of PACKS.filter((p) => group.some((l) => l.id === p.opensWith))) {
      const home = placed.get(pack.opensWith);
      const free = [0, 1, 2]
        .filter((column) => !taken.has(column))
        .sort((a, b) => Math.abs(COLUMN[a] - COLUMN[home.column]) - Math.abs(COLUMN[b] - COLUMN[home.column]) || a - b);
      if (free.length) taken.add(free[0]);
      placed.set(pack.id, {
        unit: pack,
        at,
        column: free.length ? free[0] : home.column,
        y: home.y + (free.length ? 0 : SLIP),
        slip: !free.length,
      });
    }
  }

  const stops = [...placed.values()].map((spot) => ({
    id: spot.unit.id,
    kind: kind(spot.unit),
    title: spot.unit.title,
    x: Math.round(COLUMN[spot.column] * width),
    y: spot.y,
    column: spot.column,
    depth: spot.at,
    size: SIZE[kind(spot.unit)],
    slip: spot.slip,
  }));
  /* A caption is as wide as the room its row leaves it: the stop beside it in the same
   * row sets one edge, the map's own margin the other, and a stop alone in its row has
   * the whole width to write in. The narrowest row in the course — three stops across a
   * 360px map — leaves `captionWidth(360)`; a detour alone in a row gets much more, and
   * the room is what decides how many lines a name takes. */
  for (const stop of stops) {
    const beside = stops
      .filter((other) => other.y === stop.y && other.x !== stop.x)
      .reduce((near, other) => Math.min(near, Math.abs(other.x - stop.x)), Infinity);
    stop.caption = Math.max(MIN_CAPTION, Math.min(
      2 * (stop.x - MARGIN),
      2 * (width - stop.x - MARGIN),
      Number.isFinite(beside) ? beside - GUTTER : Infinity,
    ));
  }

  const byId = new Map(stops.map((stop) => [stop.id, stop]));

  /* A leg is a `requires`: the lesson that has to be finished first, and the stop
   * it opens. A pack's thread is the lesson it hangs off and nothing else. */
  const legs = [
    ...LESSONS.flatMap((lesson) => (lesson.requires ?? []).map((id) => ({ from: id, to: lesson.id, kind: 'route' }))),
    ...PACKS.map((pack) => ({ from: pack.opensWith, to: pack.id, kind: 'detour' })),
  ].filter((leg) => byId.has(leg.from) && byId.has(leg.to));

  /* The height is derived from the same constants the drawing uses, so the last
   * row's caption cannot be cut off by a number written down somewhere else. */
  const deepest = stops.reduce((lowest, stop) => Math.max(lowest, stop.y), 0);
  cache = { width, stops, legs, byId, height: Math.round(deepest + SIZE.lesson / 2 + FOOTING) };
  return cache;
}

/* The map opens where the child is: the scroll that puts the stop they are on in
 * the middle of the window, clamped to what there is to scroll. A fresh device is
 * at the top because the first stop is at the top. */
export function scrollFor({ stops: list, viewport, scroll, id }) {
  const stop = list.find((entry) => entry.id === id);
  if (!stop) return scroll;
  return Math.max(0, Math.min(stop.y - Math.round(viewport / 2), scroll));
}
