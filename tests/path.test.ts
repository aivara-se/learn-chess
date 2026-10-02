/* The map's own rules — run with `bun test`.
 *
 * The card that draws the path has one rule a machine can hold it to, and this file
 * is where it is held: **every stop the graph has is drawn exactly once, and no stop
 * is drawn that the graph does not have.** "Drawn" here means placed by
 * `src/path/layout.js`, which is pure geometry — it takes the scale the window covers
 * and returns the stops and the legs — and every stop the scene draws is one of its
 * entries, in the order it returns them. That is what lets the rule be checked in CI
 * with no browser, and the pull request's browser check (`~/tmp/pw/path-check.ts`)
 * holds the other half: that the drawn map is this one.
 *
 * The placement itself is the card's own rule, and it is checked here too: a stop's x
 * is its depth in the `requires` graph and its y is the painting's road at that x
 * (`src/map/road.js`), and the path is a **chain**: one stop at every depth, each of them
 * standing on the road the painting drew. A detour hangs off the road between two stops,
 * and no two stops that share ground claim the same pixels. Every number below is read off
 * the tree — the road table, the graph, the fit — and none of them is written down twice.
 *
 * The rest of the file is the behaviour the card is about, also without a browser:
 * a fresh device has one open stop and the rest locked; a stop opens exactly when the
 * graph says, which on a chain is the lesson after it; a star is a first try; and the
 * rank follows the stars.
 */
import { describe, expect, test } from 'bun:test';
import { LESSONS, PACKS } from '../src/data/lessons.js';
import {
  blank,
  bossKey,
  byId,
  counts,
  drillKey,
  finished,
  heldBy,
  here,
  open,
  puzzles,
  rank,
  ranks,
  state,
  stops as allStops,
  totalDrills,
} from '../src/path/progress.js';
import { DETOUR, FACE, FORK, depth, detourDepth, layout, panFor } from '../src/path/layout.js';
import { SPAN, WORLD, roadAt } from '../src/map/road.js';
import { coverFit, panRange } from '../src/map/terrain.js';
/* A record built from keys, so a test states where the child is rather than playing
   a course to get there. `first` is written with `done` because a star is a puzzle
   that was solved — the star is the extra fact, not a replacement for it. */
const drillsOf = (unit: any) => (unit.drills ?? []).map((_: unknown, i: number) => drillKey(unit.id, i));
const record = (keys: string[] = [], bosses: number[] = []) => ({
  done: Object.fromEntries(keys.map((key) => [key, true])),
  first: Object.fromEntries(keys.map((key) => [key, true])),
  boss: Object.fromEntries(bosses.map((level) => [bossKey(level), true])),
});
/* Everything finished except the named stops — a boss stop among them is left unwon,
   so "everything" is everything the record can finish. */
const allDoneExcept = (except: string[] = []) => record(
  allStops.filter((unit) => !except.includes(unit.id)).flatMap(drillsOf),
  LESSONS.filter((l: any) => l.boss && !except.includes(l.id)).map((l: any) => l.boss.level),
);
/* The window shapes the game is played at, and the cover each one asks for: the
   layout is pure geometry per scale, and these are the scales that really happen. */
const WINDOWS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];
const SHAPES = WINDOWS.map((size) => ({ ...size, fit: coverFit(size), max: panRange(size, coverFit(size)).x }));
const DEEPEST = LESSONS.reduce((low, lesson: any) => Math.max(low, depth(lesson)), 0);
const STEP = (SPAN.to - SPAN.from) / DEEPEST;
const across = (d: number) => SPAN.from + STEP * d;

describe('the map draws the graph', () => {
  const graph = allStops.map((unit) => unit.id);

  test('every stop the graph has is drawn exactly once, and nothing else is', () => {
    for (const { fit } of SHAPES) {
      const drawn = layout(fit.scale).stops.map((stop) => stop.id);
      expect([...drawn].sort()).toEqual([...graph].sort());
      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  test('a stop is placed by the graph: its x is its depth, its y is the road', () => {
    for (const { fit } of SHAPES) {
      const map = layout(fit.scale);
      for (const lesson of LESSONS as any[]) {
        const stop = map.byId.get(lesson.id)!;
        /* Across the painting by the course's own depth, and nothing else decides
           it: no coordinate table, so a lesson added to the graph is placed by the
           graph. */
        expect(stop.u).toBeCloseTo(across(depth(lesson)), 9);
        expect(stop.x).toBe(Math.round(across(depth(lesson)) * WORLD.width * fit.scale));
      }
      for (const stop of map.stops) {
        /* Down the painting by the road the painting draws, at the stop's own x, plus
           only the offset the graph gave it — zero on the road, a branch of a fork
           off it. Every stop is held to this, a detour included. */
        expect(stop.y).toBe(Math.round(roadAt(stop.u) * WORLD.height * fit.scale + stop.off));
        if (stop.off === 0) {
          expect(stop.y).toBe(Math.round(roadAt(stop.u) * WORLD.height * fit.scale));
        }
      }
      /* A lesson alone at its depth stands on the road itself. */
      for (const lesson of LESSONS as any[]) {
        const alone = LESSONS.filter((l: any) => depth(l) === depth(lesson)).length === 1;
        if (alone) expect(map.byId.get(lesson.id)!.off).toBe(0);
      }
    }
  });

  test('the course is a chain: one stop at every depth, every stop on the road', () => {
    for (const { fit } of SHAPES) {
      const map = layout(fit.scale);
      const byDepth = new Map<number, any[]>();
      for (const stop of map.stops.filter((entry) => entry.kind !== 'pack')) {
        if (!byDepth.has(stop.depth)) byDepth.set(stop.depth, []);
        byDepth.get(stop.depth)!.push(stop);
      }
      /* The path is linear, so no depth holds two lessons. A fork would need two markers
         at one x and there is one line of them on the operator's map — `scripts/verify-site.ts`
         fails a course that forks, so this cannot come back by accident. */
      for (const group of byDepth.values()) expect(group.length).toBe(1);
      /* And a stop on the course stands on the road the painting drew, which is the
         whole reason `src/map/road.js` exists. A detour is the exception and it is
         the one the test above covers: it hangs above the road, beside the path. */
      for (const stop of map.stops.filter((entry) => entry.kind !== 'pack')) {
        expect(stop.off).toBe(0);
        expect(stop.y).toBe(stop.onRoad);
      }
    }
  });

  test('a detour hangs off the road between two stops', () => {
    for (const { fit } of SHAPES) {
      const map = layout(fit.scale);
      for (const pack of PACKS as any[]) {
        const stop = map.byId.get(pack.id)!;
        const home = map.byId.get(pack.opensWith)!;
        expect(stop.kind).toBe('pack');
        /* Half a step past the lesson that teaches it, `DETOUR` clear of the road:
           a detour beside the path, never a third branch of a fork — and clear of
           the road because half a step is nothing like enough room for a 96px tower
           and a 54px medallion to stand side by side. */
        expect(stop.off).toBe(-DETOUR);
        expect(stop.u - home.u).toBeCloseTo(STEP / 2, 9);
        expect(stop.depth).toBe(home.depth);
        expect(stop.y).toBe(Math.round(roadAt(stop.u) * WORLD.height * fit.scale - DETOUR));
      }
    }
  });

  test('a detour off the deepest lesson stands before it, never on it', () => {
    /* No detour hangs off the live course's last depth, so this is a shape a course
       would only meet if one were added. At the deepest depth the half-step past the
       lesson has nowhere to go — it is the end of the road — and a detour there would
       stand on the stop it belongs to. */
    for (let deepest = 1; deepest <= 20; deepest += 1) {
      for (let d = 0; d <= deepest; d += 1) {
        const at = detourDepth(d, deepest);
        /* A half-integer: a lesson stands at every whole depth, so a detour can never
           be drawn on a lesson's x — which is what keeps "two stops never stand in the
           same place" true whatever the course grows into. */
        expect(Number.isInteger(at)).toBe(false);
        expect(at).toBeGreaterThan(0);
        expect(at).toBeLessThan(deepest);
      }
      /* And the end of the road is never where it hangs. */
      expect(detourDepth(deepest, deepest)).toBe(deepest - 0.5);
    }
    /* The live course's own detours, on its own deepest depth. */
    for (const pack of PACKS as any[]) {
      const home = depth(LESSONS.find((lesson: any) => lesson.id === pack.opensWith));
      const at = detourDepth(home, DEEPEST);
      expect(Number.isInteger(at)).toBe(false);
      expect(at).toBeGreaterThan(home);
      expect(at).toBeLessThanOrEqual(DEEPEST);
    }
  });

  test('two stops never stand in the same place', () => {
    for (const { fit } of SHAPES) {
      const map = layout(fit.scale);
      const where = map.stops.map((stop) => `${stop.x}@${stop.y}`);
      expect(new Set(where).size).toBe(where.length);
    }
  });

  test('no two markers are drawn over each other, and each stands inside the world', () => {
    for (const { fit } of SHAPES) {
      const map = layout(fit.scale);
      for (const stop of map.stops) {
        expect(stop.x - stop.face / 2).toBeGreaterThanOrEqual(-1);
        expect(stop.x + stop.face / 2).toBeLessThanOrEqual(map.world.width + 1);
        expect(stop.y - stop.half).toBeGreaterThanOrEqual(-1);
        expect(stop.y + stop.half).toBeLessThanOrEqual(map.world.height + 1);
      }
      /* The map carries no words any more, so the only thing two stops can collide
         over is their markers — and none of them may. This is the rule the span's
         own end has to respect: ten stops west of the bridge means a step of about
         68px on the smallest phone, which is why no marker is drawn wider than
         that (`src/path/layout.js`'s FACE) and why a detour stands clear of the
         road rather than on it. */
      for (let i = 0; i < map.stops.length; i += 1) {
        for (let j = i + 1; j < map.stops.length; j += 1) {
          const a = map.stops[i];
          const b = map.stops[j];
          const across = Math.min(a.x + a.face / 2, b.x + b.face / 2) - Math.max(a.x - a.face / 2, b.x - b.face / 2);
          const deep = Math.min(a.y + a.half, b.y + b.half) - Math.max(a.y - a.half, b.y - b.half);
          expect(across > 0 && deep > 0 ? `${a.id} over ${b.id}` : 'clear').toBe('clear');
        }
      }
    }
  });

  test('the map opens on the child’s stop, clamped to what there is to pan', () => {
    for (const { width, fit, max } of SHAPES) {
      const map = layout(fit.scale);
      for (const stop of map.stops) {
        const pan = panFor({ stops: map.stops, width, max, id: stop.id });
        expect(pan).toBeGreaterThanOrEqual(0);
        expect(pan).toBeLessThanOrEqual(max);
        /* The stop it panned to is on the screen, not panned past. */
        expect(stop.x - pan).toBeGreaterThanOrEqual(0);
        expect(stop.x - pan).toBeLessThanOrEqual(width);
      }
      /* A direction with room everywhere: the painting is wider than every window
         this game is played in, so the map always has somewhere to go. */
      expect(max).toBeGreaterThan(0);
    }
  });

  test('a leg is a `requires`; a thread is the lesson a pack hangs off', () => {
    const map = layout(SHAPES[0].fit.scale);
    const legs = map.legs.map((leg) => `${leg.from}->${leg.to}`);
    const wants = [
      ...LESSONS.flatMap((lesson: any) => (lesson.requires ?? []).map((id: string) => `${id}->${lesson.id}`)),
      ...PACKS.map((pack: any) => `${pack.opensWith}->${pack.id}`),
    ];
    expect([...legs].sort()).toEqual([...wants].sort());
    for (const leg of map.legs) {
      /* Both ends are placed stops, or the trail would be drawn to nowhere. */
      expect(map.byId.has(leg.from)).toBe(true);
      expect(map.byId.has(leg.to)).toBe(true);
    }
  });
});

describe('a fresh device', () => {
  const fresh = blank();

  test('has one open stop — the first lesson — and every other stop locked', () => {
    const openStops = allStops.filter((unit) => open(fresh, unit));
    expect(openStops.map((unit) => unit.id)).toEqual([LESSONS[0].id]);
    for (const unit of allStops.filter((s) => s.id !== LESSONS[0].id)) {
      expect(state(fresh, unit)).toBe('locked');
      expect(heldBy(fresh, unit)).not.toBeNull();
    }
  });

  test('puts the child on that stop', () => {
    expect(here(fresh)!.id).toBe(LESSONS[0].id);
    expect(counts(fresh)).toEqual({ solved: 0, stars: 0, of: totalDrills });
  });
});

describe('the path opens the way the graph says', () => {
  test('finishing a lesson opens exactly the stops it is the last requirement of', () => {
    /* One lesson finished, nothing else: the stops that open are the ones the graph
       names as requiring it — for the first stop, both branches of the fork. */
    const first = record(drillsOf(LESSONS[0]));
    const opened = allStops.filter((unit) => unit.id !== LESSONS[0].id && open(first, unit)).map((unit) => unit.id).sort();
    const wants = LESSONS.filter((l: any) => (l.requires ?? []).includes(LESSONS[0].id)).map((l: any) => l.id).sort();
    expect(opened).toEqual(wants);
    expect(wants.length).toBe(1); // the path is linear: one lesson follows the first, and nothing else

    /* Everything finished but that lesson: it is open, and it is open because every
       requirement it names is done. */
    for (const lesson of LESSONS) {
      expect(open(allDoneExcept([lesson.id]), lesson)).toBe(true);
    }
  });

  test('a stop needs the one lesson before it, and never more than one', () => {
    /* The path is a chain: every lesson names at most one requirement — the lesson before
       it — and it opens exactly when that one is finished. A fork's merge, which needed
       two branches and neither alone, cannot be written down any more. */
    /* A boss stop is left out: it has no drills of its own, so a record of drills alone
       reports it finished. Every other test in this file covers the boss stops. */
    for (const lesson of (LESSONS as any[]).filter((entry) => !entry.boss)) {
      const requires = lesson.requires ?? [];
      expect(requires.length).toBeLessThanOrEqual(1);
      for (const one of requires) {
        const record_ = allDoneExcept([one, lesson.id]);
        expect(state(record_, lesson)).toBe('locked');
        expect(heldBy(record_, lesson)).toBe(one);
      }
      expect(state(allDoneExcept([lesson.id]), lesson)).toBe('open');
    }
  });

  test('a stop is never locked while a stop it requires is unfinished', () => {
    /* No boss is pre-won here: a win against a harder Pip also finishes the easier
       stop (that is the rule tested below), and it is not what this test is about. */
    const bosses = LESSONS.filter((l: any) => l.boss).map((l: any) => l.id);
    for (const lesson of LESSONS) {
      for (const id of (lesson as any).requires) {
        const record_ = allDoneExcept([id, lesson.id, ...bosses]);
        expect(state(record_, lesson)).toBe('locked');
        expect(heldBy(record_, lesson)).toBe(id);
      }
    }
  });

  test('a pack is offered by its lesson and required by nothing', () => {
    for (const pack of PACKS) {
      expect(state(allDoneExcept([pack.id]), pack)).toBe('open');
      expect(state(allDoneExcept([(pack as any).opensWith, pack.id]), pack)).toBe('locked');
      expect(LESSONS.every((lesson: any) => !(lesson.requires ?? []).includes(pack.id))).toBe(true);
    }
  });

  test('a pack solved ahead of its lesson keeps its tick, and is still held by that lesson', () => {
    const pack = PACKS[0] as any;
    const record_ = record(drillsOf(pack));
    /* "Done" is the tick it earned; it is not open, so a tap on it answers with the
       lesson that holds it rather than walking into a detour the path has not
       offered yet. */
    expect(state(record_, pack)).toBe('done');
    expect(open(record_, pack)).toBe(false);
    expect(heldBy(record_, pack)).toBe(pack.opensWith);
  });

  test('a boss stop is finished by the game, at its level or harder', () => {
    const boss = LESSONS.find((l: any) => l.boss) as any;
    expect(state(record([], [boss.boss.level - 1]), boss)).not.toBe('done');
    expect(state(record([], [boss.boss.level]), boss)).toBe('done');
    expect(state(record([], [boss.boss.level + 1]), boss)).toBe('done');
  });
});

describe('the maths', () => {
  test('a star is a first try: solved without one is not a star', () => {
    const lesson = LESSONS[1] as any;
    const solved = { done: { [drillKey(lesson.id, 0)]: true }, first: {}, boss: {} };
    expect(puzzles(solved, lesson)).toEqual({ of: lesson.drills.length, solved: 1, stars: 0 });
    const first = { done: { [drillKey(lesson.id, 0)]: true }, first: { [drillKey(lesson.id, 0)]: true }, boss: {} };
    expect(puzzles(first, lesson)).toEqual({ of: lesson.drills.length, solved: 1, stars: 1 });
  });

  test('both numbers are counted from the course, and the total is derived', () => {
    const counted = allStops.reduce((n: number, unit: any) => n + (unit.drills ?? []).length, 0);
    expect(totalDrills).toBe(counted);
    expect(counts(allDoneExcept()).solved).toBe(totalDrills);
    expect(counts(allDoneExcept()).stars).toBe(totalDrills);
    expect(counts(blank()).of).toBe(totalDrills);
  });

  test('the rank follows the stars, and the ladder only goes up', () => {
    expect(rank(0)).toMatchObject({ name: 'Pawn', next: 'Knight', need: 6 });
    expect(rank(5)).toMatchObject({ name: 'Pawn', next: 'Knight', need: 1 });
    expect(rank(6)).toMatchObject({ name: 'Knight', next: 'Bishop', need: 7 });
    expect(rank(totalDrills)).toMatchObject({ name: ranks[ranks.length - 1][0], next: null, need: 0 });
    for (let step = 1; step < ranks.length; step += 1) {
      expect(ranks[step][1]).toBeGreaterThan(ranks[step - 1][1]);
    }
    /* King is short of the last star: the top rung is inside the course, not past it */
    expect(ranks[ranks.length - 1][1]).toBeLessThan(totalDrills);
    for (let stars = 0; stars <= totalDrills; stars += 1) {
      const at = rank(stars);
      expect(at.stars).toBe(stars);
      expect(at.from).toBeLessThanOrEqual(stars);
      expect(at.to).toBeGreaterThanOrEqual(stars);
    }
  });

  test('finishing everything puts the child nowhere on the map', () => {
    expect(here(allDoneExcept())).toBeNull();
    expect(finished(allDoneExcept(), allStops[0])).toBe(true);
  });
});
