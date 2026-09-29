/* The map's own rules — run with `bun test`.
 *
 * The card that draws the new map has two things a machine can hold it to, and this
 * file holds both, without a browser:
 *
 *   - **The region a stop stands in is its depth in the `requires` graph, not a
 *     coordinate.** The layout puts a stop at `TOP + depth * 152` (`src/path/layout.js`),
 *     and the art's three bands were cut from one painting at fixed heights
 *     (`src/map/terrain.js`). Those two facts have to agree: the meadow holds the
 *     first rows, the pass the middle ones, the dark end the last — the journey from
 *     green to hostile *is* the difficulty curve, so a stop in the wrong band is a
 *     course that reads wrong however it looks.
 *   - **The route covers its leg and says its state with its shape.** A walked leg is
 *     a close-set run of beads that touch; a leg not walked is a sparse one that does
 *     not, so the two are told apart without reading a colour. `beadRun` is pure
 *     arithmetic, which is why it can be checked here rather than off a screenshot.
 *
 * `~/tmp/pw/map-check.ts` (the pull request's browser check) holds the other half:
 * that the drawn map is this one — the bands where they should be, the beads the
 * colour they should be, and the number legible on the stop the child is on.
 */
import { describe, expect, test } from 'bun:test';
import { BANDS, WORLD, bandAt } from '../src/map/terrain.js';
import { BEAD, beadRun } from '../src/map/route.js';
import { MARKER, OVERLAY, STAR } from '../src/map/marker.js';
import { LESSONS } from '../src/data/lessons.js';
import { TOP, depth, layout } from '../src/path/layout.js';
import { TAP_FLOOR } from '../src/ui/theme.js';

describe('the ground is placed by the graph', () => {
  test('the three bands are stacked with no gap and no overlap', () => {
    expect(BANDS[0].y).toBe(0);
    for (let i = 1; i < BANDS.length; i += 1) {
      expect(BANDS[i].y).toBe(BANDS[i - 1].y + BANDS[i - 1].height);
    }
    const last = BANDS[BANDS.length - 1];
    expect(last.y + last.height).toBe(WORLD.height);
  });

  test('a stop stands in the region its depth belongs to', () => {
    /* The course walks green first and dark last: the first three rows are the
       meadow, the next three the pass, the last the dark end. That is the card's
       words — the progression is the difficulty curve — and this is where the art's
       band heights and the layout's derived rows are held to them. */
    const region = (row: number) => (row <= 2 ? 'meadow' : row <= 5 ? 'pass' : 'ash');
    for (const width of [360, 520, 900]) {
      const map = layout(width);
      for (const stop of map.stops) {
        const row = Math.round((stop.y - TOP) / 152);
        expect(bandAt(stop.y).id).toBe(region(row));
        /* And the row is the depth: nothing here re-decides where a stop is. */
        expect(row).toBe(stop.depth);
      }
    }
  });

  test('every row the course has lands in a band, down to the last lesson', () => {
    const rows = LESSONS.map((lesson: any) => depth(lesson));
    const deepest = Math.max(...rows);
    expect(bandAt(TOP + deepest * 152).id).toBe('ash');
    expect(bandAt(TOP).id).toBe('meadow');
  });
});

describe('the route', () => {
  const from = { x: 100, y: 300, size: 64 };
  const to = { x: 356, y: 452, size: 48 };
  const span = Math.hypot(to.x - from.x, to.y - from.y);
  const clear = (stop: any) => Math.round(stop.size / 2) + 6;

  test('every bead is on the leg, between the two stops', () => {
    for (const spacing of [BEAD.route.walked, BEAD.route.unwalked]) {
      const run = beadRun(from, to, { spacing, clearFrom: clear(from), clearTo: clear(to) });
      expect(run.length).toBeGreaterThan(1);
      for (const bead of run) {
        /* On the line: the cross product of (to-from) and (bead-from) is zero. */
        const cross = (to.x - from.x) * (bead.y - from.y) - (to.y - from.y) * (bead.x - from.x);
        expect(Math.abs(cross)).toBeLessThan(0.001);
        const at = Math.hypot(bead.x - from.x, bead.y - from.y);
        expect(at).toBeGreaterThanOrEqual(clear(from));
        expect(at).toBeLessThanOrEqual(span);
      }
    }
  });

  test('a walked leg is close-set enough to touch, a leg not walked is not', () => {
    expect(BEAD.route.walked).toBeLessThanOrEqual(BEAD.route.size);
    expect(BEAD.route.unwalked).toBeGreaterThan(BEAD.route.size);
    const walked = beadRun(from, to, { spacing: BEAD.route.walked, clearFrom: clear(from), clearTo: clear(to) });
    const unwalked = beadRun(from, to, { spacing: BEAD.route.unwalked, clearFrom: clear(from), clearTo: clear(to) });
    expect(walked.length).toBeGreaterThan(unwalked.length);
    /* Both runs reach the far end of the leg they may cover: a trail that stops half
       way reads as a leg that goes nowhere. The run keeps clear of the marker at the
       far end, so the gap left is measured from where a bead may last be. */
    const reach = (run: any[]) => Math.hypot(run[run.length - 1].x - from.x, run[run.length - 1].y - from.y);
    expect(span - clear(to) - reach(walked)).toBeLessThan(BEAD.route.walked);
    expect(span - clear(to) - reach(unwalked)).toBeLessThan(BEAD.route.unwalked);
  });

  test('a detour’s thread is the same bead at half the weight', () => {
    expect(BEAD.detour.size).toBeLessThan(BEAD.route.size);
    expect(BEAD.detour.glow).toBeLessThan(BEAD.route.glow);
    expect(BEAD.detour.walked).toBeLessThan(BEAD.route.walked);
    expect(BEAD.detour.unwalked).toBeLessThan(BEAD.route.unwalked);
  });

  test('a leg with no length still yields one bead rather than none', () => {
    expect(beadRun({ x: 10, y: 10 }, { x: 10, y: 10 }, { spacing: 12 }).length).toBe(1);
  });
});

describe('a marker', () => {
  test('is never smaller than a finger', () => {
    for (const [kind, shape] of Object.entries(MARKER)) {
      expect(shape.width, kind).toBeGreaterThanOrEqual(TAP_FLOOR);
      expect(shape.height, kind).toBeGreaterThanOrEqual(TAP_FLOOR);
    }
    expect(STAR.size).toBeGreaterThan(0);
    /* The state overlays were drawn over the lesson's shield: every marker scales
       them from that box, so the box is the one the art was drawn against. */
    expect(OVERLAY.width).toBe(MARKER.lesson.width);
    expect(OVERLAY.height).toBe(MARKER.lesson.height);
  });
});
