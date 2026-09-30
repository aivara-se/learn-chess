/* Where each row of the map stands: the room the words under a stop need.
 *
 * `src/path/layout.js` puts a row at `TOP + depth * ROW` — the grid the art card
 * painted the world against — and a stop's row *is* its depth in the `requires`
 * graph, so the region a stop stands in is the course and not a coordinate. What
 * the grid cannot know is how tall the words under a stop are: a caption is a name,
 * a row of stars and a line, and at 360px wide the deepest of them reaches 132px
 * below its marker while the next row's marker begins 116px below it. Drawn as the
 * grid says, six pairs of stops in this course overlap and the marker below is drawn
 * over the words above it — the `pin` marker lands in the middle of the line under
 * `piece-values`, so "after lesson 1" reads "afte", marker, "n 1". That is
 * `learn-chess#60`.
 *
 * So a row is *placed*, not fixed: it starts where the grid puts it and moves later
 * only as far as the boxes really drawn in the rows above demand. Three bounds hold
 * the picture to the course:
 *
 *   - a row never leaves the band its nominal y stands in (`src/map/terrain.js`),
 *     so the walk from the meadow to the dark end is still the difficulty curve;
 *   - a caption never runs past the ground, so no stop is drawn on the void the
 *     painting does not cover.
 *
 * The boxes are the ones `src/path/stop.js` really drew: its `box` is the marker,
 * the caption and Pip as one rectangle, so the constraint is between what a child
 * sees rather than between two numbers written down here. Two stops may only be
 * constrained against each other if their boxes overlap across the map — a stop in
 * one column never collides with the next column's — and they must leave `GUTTER`
 * pixels of clear ground between them.
 *
 * The placement is one pass over the rows in order: a row's y is the latest of the
 * grid, its band's top, and every constraint from a row above it — monotone, so the
 * rows stay in the order the course puts them, and a row only ever opens the room the
 * words above it were measured to need. No iteration, no randomness, the same answer
 * every time. `problems` is the honest half of the result: a course whose words need
 * more room than its band leaves cannot be placed, and the caller reports that instead
 * of hiding it behind a clamp.
 */
import { GUTTER } from './layout.js';

const overlaps = (a, b) => a.x + a.left < b.x + b.right && b.x + b.left < a.x + a.right;

export function place({ rows, boxes, ground }) {
  const placed = new Map();
  const problems = [];

  for (const row of [...rows].sort((a, b) => a.depth - b.depth)) {
    const mine = boxes.filter((box) => box.row === row.depth);
    let y = row.nominal;

    for (const above of boxes) {
      const before = placed.get(above.row);
      if (before === undefined) continue;
      for (const below of mine) {
        if (!overlaps(above, below)) continue;
        y = Math.max(y, before + above.bottom + GUTTER - below.top);
      }
    }

    const cap = row.max;
    if (y > cap) {
      problems.push(`row ${row.depth} needs ${Math.round(y)} and may stand no lower than ${cap}`);
      y = cap;
    }

    const low = mine.reduce((deepest, box) => Math.max(deepest, box.bottom), 0);
    if (y + low > ground) problems.push(`row ${row.depth} draws its caption past the ground at ${Math.round(y + low)}`);

    placed.set(row.depth, y);
  }

  return { y: placed, problems };
}
