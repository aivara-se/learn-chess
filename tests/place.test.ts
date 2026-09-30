/* The rows are placed where the words under them need the room — learn-chess#60.
 *
 * A unit test cannot measure wrapped text, so the boxes below are the ones the map
 * really drew: `tests/fixtures/map-boxes.ts` is written by the pull request's browser
 * check, which reads `window.learnChessPath.stops()` in headless Chromium for three
 * progress states at three widths —
 *
 *   NODE_PATH=$HOME/.bun/install/global/node_modules bun ~/tmp/pw/pairs.ts <checkout> <port> --fixture
 *
 * — and this holds the placement to the card's own acceptance on that geometry: no two
 * stops' boxes overlap, every row stands in the band its depth names, and the rows stay
 * in the order the course puts them. The browser check asserts the same three things
 * against the live screen, which is where the fixture comes from.
 */
import { describe, expect, test } from 'bun:test';
import { bandAt } from '../src/map/terrain.js';
import { ROW, TOP } from '../src/path/layout.js';
import { place } from '../src/path/place.js';
import { MAP_BOXES } from './fixtures/map-boxes.ts';

/* The band a row's nominal y stands in, from the tree's own reader rather than a second
   copy of the mapping; the mapping itself is held by `tests/map.test.ts`. */
const region = (depth) => bandAt(TOP + ROW * depth).id;

describe('the map places its rows so that no stop is drawn over another', () => {
  for (const [label, boxes] of Object.entries(MAP_BOXES)) {
    test(`${label}: no two stops share ground, and every row is in its band`, () => {
      const depths = [...new Set(boxes.map((box) => box.row))].sort((a, b) => a - b);
      const rows = depths.map((depth) => {
        const nominal = TOP + ROW * depth;
        const band = bandAt(nominal);
        return { depth, nominal, max: band.y + band.height - 1 };
      });

      const placed = place({ rows, boxes: [...boxes], ground: Number.POSITIVE_INFINITY });
      expect(placed.problems).toEqual([]);

      const drawn = boxes.map((box) => ({ ...box, y: placed.y.get(box.row) }));
      for (let i = 0; i < drawn.length; i += 1) {
        for (let j = i + 1; j < drawn.length; j += 1) {
          const a = drawn[i];
          const b = drawn[j];
          const across = Math.min(a.x + a.right, b.x + b.right) - Math.max(a.x + a.left, b.x + b.left);
          const deep = Math.min(a.y + a.bottom, b.y + b.bottom) - Math.max(a.y + a.top, b.y + b.top);
          const shared = across > 0 && deep > 0;
          expect(shared ? `row ${a.row} over row ${b.row} by ${across}x${deep}` : 'clear').toBe('clear');
        }
      }

      for (const row of rows) {
        expect(bandAt(placed.y.get(row.depth)).id).toBe(region(row.depth));
      }
      for (let i = 1; i < depths.length; i += 1) {
        expect(placed.y.get(depths[i])).toBeGreaterThan(placed.y.get(depths[i - 1]));
      }
    });
  }
});

describe('the placement itself', () => {
  const band = { depth: 1, nominal: 218, max: 445 };
  const box = (row, top, bottom) => ({ row, x: 180, left: -53, right: 53, top, bottom });

  test('a row opens by exactly the room the box above it needs', () => {
    const rows = [band, { depth: 2, nominal: 370, max: 889 }];
    const boxes = [{ ...box(1, -36, -20), row: 1 }, box(2, -36, 148)];
    const placed = place({ rows, boxes, ground: Infinity });
    expect(placed.problems).toEqual([]);
    expect(placed.y.get(2)).toBe(370);
    expect(placed.y.get(1)).toBe(218);

    const deep = [{ ...box(1, -36, 268), row: 1 }, box(2, -36, 148)];
    const room = place({ rows, boxes: deep, ground: Infinity });
    expect(room.y.get(2)).toBe(218 + 268 + 6 + 36);
  });

  test('a row that cannot fit its band is reported, not hidden', () => {
    const rows = [band, { depth: 2, nominal: 370, max: 460 }];
    const boxes = [{ ...box(1, -36, 268), row: 1 }, box(2, -36, 148)];
    const placed = place({ rows, boxes, ground: Infinity });
    expect(placed.problems.length).toBe(1);
    expect(placed.y.get(2)).toBe(460);
  });

  test('boxes that do not overlap across the map never constrain each other', () => {
    const rows = [band, { depth: 2, nominal: 370, max: 889 }];
    const apart = [{ ...box(1, -36, 268), row: 1, x: 68 }, { ...box(2, -36, 148), x: 292 }];
    const placed = place({ rows, boxes: apart, ground: Infinity });
    expect(placed.y.get(2)).toBe(370);
  });
});
