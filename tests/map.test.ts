/* The map's own rules — run with `bun test`.
 *
 * The card that draws the map has three things a machine can hold it to, and this
 * file holds all three, without a browser:
 *
 *   - **The painting covers the window.** One painting, drawn at a cover fit, is
 *     what makes the map edge to edge — no letterbox bar, no ground colour at the
 *     sides — and it is also what makes the pan real: a cover of a 2.357:1 painting
 *     in a window that is not 2.357:1 leaves the world wider than the pane, so there
 *     is always somewhere to pan. Both halves are arithmetic, and they are checked at
 *     the window shapes the game is played at.
 *   - **The road is a road.** `src/map/road.js` is the measured centre of the road
 *     the painting draws, and the stops stand on it; the table itself is checked here
 *     — ordered, inside the painting, interpolating and clamped at both ends — so a
 *     mistyped sample is a failing test rather than a stop standing in a field.
 *   - **The route covers its leg and says its state with its shape.** A walked leg is
 *     a close-set run of beads that touch; a leg not walked is a sparse one that does
 *     not, so the two are told apart without reading a colour. `beadRun` is pure
 *     arithmetic, which is why it can be checked here rather than off a screenshot.
 *
 * `tests/path.test.ts` holds the placement: every stop the graph has, drawn once, at
 * its depth's x and on the road's y. The pull request's browser check
 * (`~/tmp/pw/path-check.ts`) holds the other half of that: that the drawn map is this
 * one — the painting's box against the window's, every box inside it, no two boxes
 * over each other, and a drag that really pans.
 */
import { describe, expect, test } from 'bun:test';
import { ROAD, SPAN, WORLD, roadAt } from '../src/map/road.js';
import { coverFit, panRange } from '../src/map/terrain.js';
import { BEAD, beadRun } from '../src/map/route.js';
import { MARKER, OVERLAY, STAR } from '../src/map/marker.js';
import { FACE, HALF } from '../src/path/layout.js';
import { TAP_FLOOR } from '../src/ui/theme.js';

/* The window shapes the game is played at: a small phone, a phone, a laptop. None of
   them is the painting's own 2.357:1 — that shape is checked on its own below. */
const WINDOWS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

describe('the painting is the world', () => {
  test('it is the grid it was cut on, and the table is inside it', () => {
    expect(WORLD.width).toBeGreaterThan(0);
    expect(WORLD.height).toBeGreaterThan(0);
    /* The painting is not 21:9, and nothing may call it that: 2.357:1 is the ratio
       both of the operator's files carry. */
    expect(WORLD.width / WORLD.height).toBeCloseTo(2.353, 2);
    expect(Math.abs(WORLD.width / WORLD.height - 21 / 9)).toBeGreaterThan(0.015);
  });

  test('the cover fills the window in both directions at every shape', () => {
    for (const window_ of WINDOWS) {
      const fit = coverFit(window_);
      expect(fit.width, `${window_.width}x${window_.height}`).toBeGreaterThanOrEqual(window_.width);
      expect(fit.height, `${window_.width}x${window_.height}`).toBeGreaterThanOrEqual(window_.height);
      expect(fit.scale).toBeCloseTo(Math.max(window_.width / WORLD.width, window_.height / WORLD.height), 6);
      /* Nothing may show round it: a cover that rounded down would leave the window's
         far edge on the screen's own ground. */
      expect(fit.width - WORLD.width * fit.scale).toBeLessThan(1);
      expect(fit.height - WORLD.height * fit.scale).toBeLessThan(1);
    }
  });

  test('the world is wider than the pane, which is what the pan is for', () => {
    for (const window_ of WINDOWS) {
      const range = panRange(window_, coverFit(window_));
      expect(range.x, `${window_.width}x${window_.height}`).toBeGreaterThan(0);
      expect(range.y).toBeGreaterThanOrEqual(0);
      /* One direction has room and the other has none: the painting is wider than
         every window the game is played in, and no taller than any of them. */
      expect(range.y).toBe(0);
    }
  });

  test('a window the painting’s own shape has nothing to pan and nothing to show', () => {
    /* The one shape where the cover is exact. It is not a phone and not a laptop, and
       it is the shape that would go wrong first if the fit ever letterboxed: at the
       painting's own ratio the drawn box is the window, to the pixel. */
    const window_ = { width: WORLD.width, height: WORLD.height };
    const fit = coverFit(window_);
    expect(fit.scale).toBe(1);
    expect(fit.width).toBe(WORLD.width);
    expect(fit.height).toBe(WORLD.height);
    expect(panRange(window_, fit)).toEqual({ x: 0, y: 0 });
  });
});

describe('the road', () => {
  test('is ordered left to right and inside the painting', () => {
    for (let i = 1; i < ROAD.length; i += 1) {
      expect(ROAD[i][0]).toBeGreaterThan(ROAD[i - 1][0]);
    }
    expect(ROAD[0][0]).toBe(0);
    for (const [u, v] of ROAD) {
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
      /* The road never leaves the painting's middle half, where the painting drew it. */
      expect(v).toBeGreaterThan(0.25);
      expect(v).toBeLessThan(0.75);
    }
  });

  test('is read between its samples and clamped past both ends', () => {
    for (const [u, v] of ROAD) expect(roadAt(u)).toBeCloseTo(v, 6);
    expect(roadAt(-1)).toBe(ROAD[0][1]);
    expect(roadAt(2)).toBe(ROAD[ROAD.length - 1][1]);
    /* Half way between two samples is half way between their values, and nothing
       runs past a sample it has no road for. */
    for (let i = 1; i < ROAD.length; i += 1) {
      const [u0, v0] = ROAD[i - 1];
      const [u1, v1] = ROAD[i];
      const mid = roadAt((u0 + u1) / 2);
      expect(mid).toBeCloseTo((v0 + v1) / 2, 6);
      expect(Math.min(v0, v1)).toBeLessThanOrEqual(mid);
      expect(mid).toBeLessThanOrEqual(Math.max(v0, v1));
    }
  });

  test('the stops span a stretch of it that exists', () => {
    expect(SPAN.from).toBeGreaterThan(0);
    expect(SPAN.from).toBeLessThan(SPAN.to);
    /* The span's far end is the table's last sample: past it the painting's road
       turns down behind the village's houses, so a stop out there would be a stop
       standing on a roof. */
    expect(SPAN.to).toBe(ROAD[ROAD.length - 1][0]);
    expect(roadAt(SPAN.to)).toBe(ROAD[ROAD.length - 1][1]);
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

  test('is the size the layout reserved for it', () => {
    /* The layout has to know how much ground a stop claims, and the marker is what
       claims it. Two tables, one fact: this is where they are held together, so a
       marker drawn taller cannot be drawn over the words of the stop above it. */
    for (const [kind, shape] of Object.entries(MARKER)) {
      expect(HALF[kind as keyof typeof HALF], kind).toBe(shape.height / 2);
      expect(FACE[kind as keyof typeof FACE], kind).toBe(shape.width);
    }
  });
});
