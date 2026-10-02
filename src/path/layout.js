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
 *     what has to fit between them is a 96px tower and a finger's width of air at
 *     every window. A merge is placed the same way and is not special: the graph
 *     knows what it is, the picture only knows that two stops share a depth.
 *   - **No stop carries a word.** The map is icons and the lesson's number: the
 *     words live on the sheet a tap opens, so nothing here measures text and the
 *     only thing two stops can collide over is their markers.
 *   - **A detour hangs above the road between two stops**: half a step past the lesson
 *     it belongs to and `DETOUR` clear of the road, so the medallion reads as a stop
 *     beside the path rather than a third branch of a fork. A detour off the *deepest*
 *     lesson has no next stop to hang between, so it goes half a step *before* it
 *     instead — the end of the road is where that lesson already stands
 *     (`detourDepth` below). No depth in this course holds more than two lessons and
 *     `scripts/verify-site.ts` fails a course that does.
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
 * drawn sizes are `src/map/marker.js`'s (a lesson's tower 64×96, a detour's
 * medallion 48×54, a boss's crest 64×72) and `tests/map.test.ts` holds this table to
 * that one, so the two cannot drift. */
export const HALF = { lesson: 48, boss: 36, pack: 27 };

/* The marker's width, for the same reason: what a stop claims sideways. **No
 * marker is wider than the step between two stops**, which is what keeps two
 * neighbours from being drawn over each other now that the span is short: the
 * crest is drawn at the lesson tower's own 64 where the art's is 76, because ten
 * stops have to fit west of the bridge and a 76px marker does not fit in an
 * ~68px step. `tests/path.test.ts` holds the rule at the window shapes the game
 * is played at. */
export const FACE = { lesson: 64, boss: 64, pack: 48 };

/* How far apart a fork's two branches would stand: one above the road and one
 * below, so the distance between them is twice this. No course uses it any more
 * — the path is a chain — but the constant stays so the shape cannot come back
 * without a number to stand on. */
export const FORK = 48;

/* How far above the road a detour's medallion hangs. It is not the road's own
 * measurement, it is the clearance one, and the span compression is what forced it.
 * A detour stands half a step past the lesson that teaches it; half a step used to
 * be 148px and is 68px now, and a 54px medallion cannot stand 34px from a 96px
 * tower without being drawn through it. So the medallion hangs above the road
 * instead — 120 clears every pair at every window shape the game is played at,
 * measured rather than guessed, and `tests/path.test.ts` holds it. */
export const DETOUR = 120;

/* How far right a lesson is. `seen` stops a course that goes in a circle from
 * hanging the renderer — `scripts/verify-site.ts` is what fails one. */
export function depth(lesson, seen = new Set()) {
  const requires = lesson.requires ?? [];
  if (!requires.length || seen.has(lesson.id)) return 0;
  seen.add(lesson.id);
  return 1 + Math.max(...requires.map((id) => depth(LESSONS.find((l) => l.id === id), seen)));
}

/* Where a detour hangs, as a depth: half a step past the lesson that teaches it, so
 * the stops either side cannot crowd it. A detour off the *deepest* lesson has no next
 * stop to hang between — the end of the road is where that lesson already stands — so
 * it goes half a step before it instead. Half-integer either way, and a lesson stands
 * at every whole depth, so a detour's x is never a lesson's x; `tests/path.test.ts`
 * holds both halves of that. */
export const detourDepth = (home, deepest) => (home < deepest ? home + 0.5 : home - 0.5);

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
      const u = across(detourDepth(d, deepest));
      placed.set(pack.id, { unit: pack, at: d, u, off: -DETOUR, on: roadAt(u) * world.height - DETOUR });
    }
  }

  const stops = [...placed.values()].map((spot) => {
    const shape = kind(spot.unit);
    const half = HALF[shape];
    return {
      id: spot.unit.id,
      kind: shape,
      title: spot.unit.title,
      depth: spot.at,
      u: spot.u,
      off: spot.off,
      x: Math.round(spot.u * world.width),
      y: Math.round(spot.on),
      /* Where the road runs at this stop's x, without the branch offset: the point
       * the stop would stand on if its depth had one lesson, and the point a check
       * reads the painting's own pixels at. */
      onRoad: Math.round(roadAt(spot.u) * world.height),
      half,
      face: FACE[shape],
    };
  });

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
