/* The map's geometry — where every stop stands, derived from the graph and the road.
 *
 * There are no rows any more. The world is one painting read left to right, so the
 * course is read left to right too: **a stop's x is its depth in the `requires`
 * graph** (the longest chain of lessons behind it, so a stop is never drawn before
 * the lesson it needs), spread across the stretch of the painting the stops may
 * stand on, and **its y is where the painting's road runs at that x**, measured in
 * `src/map/road.js`. A hand-placed coordinate table would be a lie that drifts the
 * first time a lesson is added, and the picture of the course would go on being
 * wrong quietly; this is derived, so it cannot disagree with the course.
 *
 * Three rules the drawing needs, all of them here rather than in the screen:
 *
 *   - **A fork is two branches.** Where a depth holds two lessons, they stand one
 *     above the road and one below it — `FORK` apart, a screen measurement, because
 *     what has to fit between them is a marker and the words that hang off it, and
 *     those are drawn at fixed sizes at every window. A merge is placed the same way
 *     and is not special: the graph knows what it is, the picture only knows that two
 *     stops share a depth.
 *   - **A caption goes on the side its stop stands off the road** — away from the
 *     road, so a fork's two labels cannot meet in the middle — and below the marker
 *     for a stop standing on the road. `src/path/stop.js` draws it that way.
 *   - **A detour hangs off the road between two stops**: half a step past the lesson
 *     it belongs to, on the road itself, so the medallion reads as a stop beside the
 *     path rather than a third branch of a fork. No depth in this course holds more
 *     than two lessons and `scripts/verify-site.ts` fails a course that does.
 *
 * The layout is pure geometry — it takes the scale the window covers and returns
 * stops, legs and the world's drawn size, and knows nothing about a child's
 * progress. That is what lets `tests/path.test.ts` check the card's rule with no
 * browser: every stop the graph has is placed exactly once, every stop's x is its
 * depth, every stop's y is the road's, and no stop is placed that the graph does not
 * have. `src/scenes/path.js` draws what this returns and asks `src/path/progress.js`
 * what state each stop is in.
 */
import { LESSONS, PACKS } from '../data/lessons.js';
import { SPAN, WORLD, roadAt } from '../map/road.js';

/* The marker's own half: what a stop claims above and below its point. The art's
 * drawn sizes are `src/map/marker.js`'s (a lesson's shield 64×72, a detour's
 * medallion 48×54, a boss's crest 76×84) and `tests/map.test.ts` holds this table to
 * that one, so the two cannot drift. A screen that draws a taller marker than the
 * layout reserved is a marker drawn over the words of the stop above it. */
export const HALF = { lesson: 36, boss: 42, pack: 27 };

/* The marker's width, for the same reason: what a stop claims sideways. */
export const FACE = { lesson: 64, boss: 76, pack: 48 };

/* How far apart a fork's two branches stand: one above the road and one below, so
 * the distance between them is twice this. It is measured in screen pixels and not
 * in the painting's own, because what has to fit is a 72px marker and a 12px caption
 * at every window — and a caption does not get smaller on a laptop. 48 is the tap
 * floor, so a branch stands a finger's width off the road and the two markers cannot
 * touch: their halves are 42 at the most, and 96 > 42 + 42 + the gutter. */
export const FORK = 48;

/* The room the words under a marker take: the gap, a name of up to three lines, the
 * row of stars, and the line beneath. It is what the layout reserves when it asks
 * which stops share ground — the real box is `src/path/stop.js`'s and is measured on
 * a render by the pull request's browser check. */
export const CAPTION = 87;
/* The narrowest room a caption is ever given, and the widest: three stops across a
 * phone must still leave a name somewhere to wrap, and a name is written for a
 * nine-year-old. */
const MIN_CAPTION = 60;
export const CAP_MAX = 348;
const MARGIN = 6;                // the world's own edge, which no caption crosses
/* Between two neighbouring stops' captions. */
export const GUTTER = 6;

/* How far right a lesson is. `seen` stops a course that goes in a circle from
 * hanging the renderer — `scripts/verify-site.ts` is what fails one. */
export function depth(lesson, seen = new Set()) {
  const requires = lesson.requires ?? [];
  if (!requires.length || seen.has(lesson.id)) return 0;
  seen.add(lesson.id);
  return 1 + Math.max(...requires.map((id) => depth(LESSONS.find((l) => l.id === id), seen)));
}

const kind = (unit) => (unit.opensWith ? 'pack' : unit.boss ? 'boss' : 'lesson');

let cache = null;

/* One layout per scale: the map is rebuilt when the viewport changes and not once per
 * frame. `scale` is the cover `src/map/terrain.js` computed, so a stop's y is a share
 * of the painting's height times that scale — the same road under every window. */
export function layout(scale) {
  if (cache && cache.scale === scale) return cache;

  const world = { width: WORLD.width * scale, height: WORLD.height * scale };
  /* A lesson's own depth, and the deepest one in the course: the stops span the
   * stretch of the painting the road runs through (`SPAN`), so the deepest lesson
   * stands at its far end and nothing is written down twice. */
  const at = new Map(LESSONS.map((lesson) => [lesson.id, depth(lesson)]));
  const deepest = LESSONS.reduce((low, lesson) => Math.max(low, at.get(lesson.id)), 0);
  const step = (SPAN.to - SPAN.from) / deepest;
  const across = (d) => SPAN.from + step * d;

  const placed = new Map();
  const depths = new Map();
  for (const lesson of LESSONS) {
    const d = at.get(lesson.id);
    if (!depths.has(d)) depths.set(d, []);
    depths.get(d).push(lesson);
  }
  for (const [d, group] of [...depths.entries()].sort((a, b) => a[0] - b[0])) {
    const u = across(d);
    group.forEach((lesson, i) => {
      /* A fork's two branches: one above the road, one below. A lone lesson stands
       * on the road itself, which is the whole point of the table in road.js. */
      const off = Math.round((i - (group.length - 1) / 2) * 2 * FORK);
      placed.set(lesson.id, { unit: lesson, at: d, u, off, on: roadAt(u) * world.height + off });
    });
    /* A detour hangs off the road between this depth and the next: half a step past
     * the lesson that teaches it, so it cannot be crowded by the stops either side. */
    for (const pack of PACKS.filter((p) => group.some((l) => l.id === p.opensWith))) {
      const u = across(Math.min(d + 0.5, deepest));
      placed.set(pack.id, { unit: pack, at: d, u, off: 0, on: roadAt(u) * world.height });
    }
  }

  const stops = [...placed.values()].map((spot) => {
    const shape = kind(spot.unit);
    const half = HALF[shape];
    /* Which side of its marker a caption is written on: the side the stop stands off
     * the road, so the two branches of a fork write outwards and their words cannot
     * meet across it. A stop on the road writes below, where a reader looks for it. */
    const side = spot.off < 0 ? 'above' : 'below';
    return {
      id: spot.unit.id,
      kind: shape,
      title: spot.unit.title,
      depth: spot.at,
      u: spot.u,
      off: spot.off,
      side,
      x: Math.round(spot.u * world.width),
      y: Math.round(spot.on),
      /* Where the road runs at this stop's x, without the branch offset: the point
       * the stop would stand on if its depth had one lesson, and the point a check
       * reads the painting's own pixels at. */
      onRoad: Math.round(roadAt(spot.u) * world.height),
      half,
      face: FACE[shape],
      /* The ground a stop asks for, before its caption has been measured: the marker
       * and the room beside it, plus the words above or below. Two stops whose bands
       * overlap are two stops that have to share the width between them. */
      band: side === 'above'
        ? { top: Math.round(spot.on) - half - CAPTION, bottom: Math.round(spot.on) + half }
        : { top: Math.round(spot.on) - half, bottom: Math.round(spot.on) + half + CAPTION },
    };
  });

  /* A caption is as wide as the room its stop has: the world's own margin on one
   * side, the world's far edge on the other, and half the distance to the nearest
   * stop whose ground it shares — which is what keeps a detour's words off the lesson
   * beside it. A stop alone in the open writes across the map, up to `CAP_MAX`. The
   * one pixel of air beside `GUTTER` is for the rounding: a stop's x is a whole
   * pixel and its caption's half is not, and a rule that holds only for exact numbers
   * does not hold. `MIN_CAPTION` is the floor: a course that packs stops closer than
   * this course does would rather wrap a name than write a column of letters, and the
   * browser check holds the real boxes apart at the windows the game is played at. */
  for (const stop of stops) {
    const beside = stops
      .filter((other) => other.id !== stop.id && other.band.top < stop.band.bottom && stop.band.top < other.band.bottom)
      .reduce((near, other) => Math.min(near, Math.abs(other.x - stop.x)), Infinity);
    stop.caption = Math.max(MIN_CAPTION, Math.min(
      CAP_MAX,
      2 * (stop.x - MARGIN),
      2 * (world.width - stop.x - MARGIN),
      Number.isFinite(beside) ? Math.floor(beside) - GUTTER - 1 : Infinity,
    ));
  }

  const byId = new Map(stops.map((stop) => [stop.id, stop]));

  /* A leg is a `requires`: the lesson that has to be finished first, and the stop
   * it opens. A pack's thread is the lesson it hangs off and nothing else. */
  const legs = [
    ...LESSONS.flatMap((lesson) => (lesson.requires ?? []).map((id) => ({ from: id, to: lesson.id, kind: 'route' }))),
    ...PACKS.map((pack) => ({ from: pack.opensWith, to: pack.id, kind: 'detour' })),
  ].filter((leg) => byId.has(leg.from) && byId.has(leg.to));

  cache = { scale, world, stops, legs, byId, step, deepest };
  return cache;
}

/* The map opens where the child is: the pan that puts the stop they are on in the
 * middle of the window, clamped to what there is to pan. A fresh device is at the
 * left because the first stop is at the left — the course is read left to right.
 * A stop near either end opens as close to centred as the world allows, which is
 * the honest answer: the world does not extend past its own painting. */
export function panFor({ stops: list, width, max, id }) {
  const stop = list.find((entry) => entry.id === id);
  if (!stop) return 0;
  return Math.max(0, Math.min(stop.x - Math.round(width / 2), max));
}
