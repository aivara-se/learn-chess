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
 * (`src/map/road.js`), a fork puts one branch above the road and one below it, a
 * detour hangs off the road between two stops, and no two stops that share ground
 * claim the same pixels. Every number below is read off the tree — the road table,
 * the graph, the fit — and none of them is written down twice.
 *
 * The rest of the file is the behaviour the card is about, also without a browser:
 * a fresh device has one open stop and the rest locked; a stop opens exactly when the
 * graph says, including both branches of a fork and both sides of a merge; a star is
 * a first try; and the rank follows the stars.
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
import { FACE, FORK, GUTTER, depth, layout, panFor } from '../src/path/layout.js';
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

  test('a fork puts one branch above the road and one below it', () => {
    for (const { fit } of SHAPES) {
      const map = layout(fit.scale);
      const byDepth = new Map<number, any[]>();
      for (const stop of map.stops.filter((entry) => entry.kind !== 'pack')) {
        if (!byDepth.has(stop.depth)) byDepth.set(stop.depth, []);
        byDepth.get(stop.depth)!.push(stop);
      }
      let forks = 0;
      for (const [, group] of byDepth) {
        if (group.length !== 2) continue;
        forks += 1;
        const offsets = group.map((stop) => stop.off).sort((a, b) => a - b);
        expect(offsets).toEqual([-FORK, FORK]);
        const sides = group.map((stop) => stop.side).sort();
        expect(sides).toEqual(['above', 'below']);
        expect(Math.abs(group[0].y - group[1].y)).toBe(2 * FORK);
        /* Their words write outwards, so the two captions cannot meet in the middle:
           the upper branch's ground ends before the lower branch's marker begins. */
        const upper = group.find((stop) => stop.side === 'above')!;
        const lower = group.find((stop) => stop.side === 'below')!;
        expect(upper.y + upper.half + GUTTER).toBeLessThanOrEqual(lower.y - lower.half);
      }
      /* This course is a fork three times over, and four if a merge counts: a test
         that found none would be a test that passes on nothing. */
      expect(forks).toBeGreaterThan(1);
    }
  });

  test('a detour hangs off the road between two stops', () => {
    for (const { fit } of SHAPES) {
      const map = layout(fit.scale);
      for (const pack of PACKS as any[]) {
        const stop = map.byId.get(pack.id)!;
        const home = map.byId.get(pack.opensWith)!;
        expect(stop.kind).toBe('pack');
        /* Half a step past the lesson that teaches it, on the road: a detour beside
           the path, never a third branch of a fork. */
        expect(stop.off).toBe(0);
        expect(stop.u - home.u).toBeCloseTo(STEP / 2, 9);
        expect(stop.depth).toBe(home.depth);
        expect(stop.y).toBe(Math.round(roadAt(stop.u) * WORLD.height * fit.scale));
      }
    }
  });

  test('two stops never stand in the same place', () => {
    for (const { fit } of SHAPES) {
      const map = layout(fit.scale);
      const where = map.stops.map((stop) => `${stop.x}@${stop.y}`);
      expect(new Set(where).size).toBe(where.length);
    }
  });

  test('a caption fits the world, and two stops that share ground keep their words apart', () => {
    for (const { fit } of SHAPES) {
      const map = layout(fit.scale);
      for (const stop of map.stops) {
        expect(stop.caption).toBeGreaterThan(0);
        expect(stop.x - stop.caption / 2).toBeGreaterThanOrEqual(0);
        expect(stop.x + stop.caption / 2).toBeLessThanOrEqual(map.world.width + 1);
      }
      for (let i = 0; i < map.stops.length; i += 1) {
        for (let j = i + 1; j < map.stops.length; j += 1) {
          const a = map.stops[i];
          const b = map.stops[j];
          /* What each stop has to be drawn in: the marker, or the words when they are
             wider than it. */
          const halfA = Math.max(FACE[a.kind], a.caption) / 2;
          const halfB = Math.max(FACE[b.kind], b.caption) / 2;
          const shares = Math.abs(a.x - b.x) < halfA + halfB + GUTTER;
          /* The ground they claim top to bottom: the marker and the words on the side
             they hang on. Two stops whose ground overlaps must be far enough apart
             across the map — which is what the caption's width is measured from. */
          const over = a.band.top < b.band.bottom && b.band.top < a.band.bottom;
          const clash = shares && over;
          expect(clash ? `${a.id} over ${b.id}` : 'clear').toBe('clear');
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
    expect(wants.length).toBeGreaterThan(1); // the first stop is a fork: it opens both ways

    /* Everything finished but that lesson: it is open, and it is open because every
       requirement it names is done. */
    for (const lesson of LESSONS) {
      expect(open(allDoneExcept([lesson.id]), lesson)).toBe(true);
    }
  });

  test('a merge needs both branches, not one', () => {
    const merge = LESSONS.find((l: any) => (l.requires ?? []).length > 1) as any;
    expect(merge).toBeTruthy();
    for (const one of merge.requires) {
      const record_ = allDoneExcept([one, merge.id]);
      expect(state(record_, merge)).toBe('locked');
      expect(heldBy(record_, merge)).toBe(one);
    }
    expect(state(allDoneExcept([merge.id]), merge)).toBe('open');
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
