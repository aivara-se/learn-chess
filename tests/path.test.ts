/* The map's own rules — run with `bun test`.
 *
 * The card that draws the path has one rule a machine can hold it to, and this file
 * is where it is held: **every stop the graph has is drawn exactly once, and no stop
 * is drawn that the graph does not have.** "Drawn" here means placed by
 * `src/path/layout.js`, which is pure geometry — it takes a width and returns the
 * stops and the legs — and every stop the scene draws is one of its entries, in the
 * order it returns them. That is what lets the rule be checked in CI with no browser,
 * and `~/tmp/pw/path-check.ts` (the pull request's browser check) holds the other
 * half: that the drawn map is this one.
 *
 * The rest of the file is the behaviour the card is about, also without a browser:
 * a fresh device has one open stop and the rest locked; a stop opens exactly when the
 * graph says, including both branches of a fork and both sides of a merge; a star is
 * a first try; the rank follows the stars; and the map is tall enough for its last
 * caption and scrolls to a stop rather than past it.
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
import { SIZE, TOP, captionWidth, depth, layout, scrollFor } from '../src/path/layout.js';
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

describe('the map draws the graph', () => {
  const graph = allStops.map((unit) => unit.id);

  test('every stop the graph has is drawn exactly once, and nothing else is', () => {
    for (const width of [320, 360, 390, 520, 900]) {
      const drawn = layout(width).stops.map((stop) => stop.id);
      expect([...drawn].sort()).toEqual([...graph].sort());
      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  test('a stop is placed by the graph: its row is how far down the path it is', () => {
    const map = layout(360);
    for (const lesson of LESSONS) {
      expect(map.byId.get(lesson.id)!.y).toBe(TOP + depth(lesson) * 152);
    }
    /* A pack stands in the row of the lesson that teaches its idea — a detour beside
       the path, never a stop on it. */
    for (const pack of PACKS) {
      expect(map.byId.get(pack.id)!.depth).toBe(depth(byId.get(pack.opensWith)));
      expect(map.byId.get(pack.id)!.y).toBe(map.byId.get(pack.opensWith)!.y);
    }
  });

  test('two stops never stand in the same place, and a caption fits its column', () => {
    for (const width of [320, 360, 390, 520]) {
      const map = layout(width);
      const where = map.stops.map((stop) => `${stop.x}@${stop.y}`);
      expect(new Set(where).size).toBe(where.length);
      const half = Math.round(captionWidth(width) / 2);
      for (const stop of map.stops) {
        expect(stop.x - half).toBeGreaterThanOrEqual(0);
        expect(stop.x + half).toBeLessThanOrEqual(width);
      }
    }
  });

  test('a leg is a `requires`; a thread is the lesson a pack hangs off', () => {
    const map = layout(360);
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

  test('the map is tall enough for its last caption, and scrolls to a stop', () => {
    const map = layout(360);
    const deepest = map.stops.reduce((low, stop) => Math.max(low, stop.y), 0);
    expect(map.height).toBeGreaterThan(deepest + SIZE.lesson / 2);
    /* The footing is the room for a caption, its stars and a margin. */
    expect(map.height - (deepest + SIZE.lesson / 2)).toBeGreaterThanOrEqual(96);

    for (const viewport of [400, 520, 2000]) {
      const max = Math.max(0, map.height - viewport);
      for (const stop of map.stops) {
        const at = scrollFor({ stops: map.stops, viewport, scroll: max, id: stop.id });
        expect(at).toBeGreaterThanOrEqual(0);
        expect(at).toBeLessThanOrEqual(max);
        /* The stop it scrolled to is on the screen, not scrolled past. */
        if (max > 0) {
          expect(stop.y - at).toBeGreaterThan(0);
          expect(stop.y - at).toBeLessThan(viewport);
        }
      }
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
