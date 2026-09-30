/* The painting's own numbers: the grid it was cut on, and the road it draws.
 *
 * The map is one painting (`assets/map/world.png`, the operator's own) and the
 * stops do not float on it — they stand on the road it drew. That is only true if
 * the road's own course is written down somewhere, so it is here: the road's centre
 * as a share of the painting's height, sampled left to right.
 *
 * **How these numbers were taken, so nobody has to take them again.** The cut was
 * read column by column for the tan of packed dirt (red over green over blue, green
 * clearly over blue, mid-bright), the run nearest the column before it was kept —
 * a continuity rule, because a roof and a road are the same brown — and the line
 * the trace drew was drawn back onto the painting and looked at. It follows the
 * road over the bridge and past the mill: the trace is the record, and this table
 * is the trace at every sixteenth of the width.
 *
 * The one place it was wrong on the first pass is the village, and it is worth
 * writing down why the table stops where it does. Past `u` of about 0.88 the
 * column reader leaves the street and climbs the roofs — the same brown, and the
 * village's street bends down behind its houses, so what the reader finds up there
 * is a roof ridge and not a road. The village street really does run on to about
 * `u` 0.95, where it turns down between the houses, and then there is no road at
 * the far right of the frame at all: the last of the painting is gardens. So the
 * table covers the road the stops may stand on and stops at the square, and
 * `SPAN.to` is its last sample — a stop past this table would be a stop standing
 * on a roof.
 *
 * A value here is a share of the painting's height, not a pixel: the world is drawn
 * at whatever scale covers the window, so a y in pixels is a fact about one window
 * and a share of the height is a fact about the painting.
 */

/* The painting's own pixels, which is also the grid it was cut on. A y in the world
 * is a share of this height times the scale the window covers, never a pixel of a
 * window. `src/map/terrain.js` is what draws it at that size. */
export const WORLD = { width: 640, height: 272 };

/* `[u, v]`: u across the painting (0 left, 1 right), v its road's centre as a share
 * of the height. Every sixteenth, from the left edge to the village square. */
export const ROAD = [
  [0.000, 0.505], [0.063, 0.486], [0.125, 0.519], [0.188, 0.561],
  [0.250, 0.559], [0.313, 0.515], [0.375, 0.490], [0.438, 0.528],
  [0.500, 0.566], [0.563, 0.558], [0.625, 0.508], [0.688, 0.478],
  [0.750, 0.534], [0.813, 0.551], [0.875, 0.556],
];

/* The stretch of the painting the stops span, in `u`. It starts a little inside the
 * left edge — a stop's caption is centred on it and would otherwise be half off the
 * world — and it ends at the table's own last sample: the road is there, the road
 * past it is behind the village's houses. */
export const SPAN = { from: 0.055, to: ROAD[ROAD.length - 1][0] };

/* The road's centre at `u`, as a share of the painting's height. Straight lines
 * between the samples, clamped at both ends — past the table there is no road to
 * follow, and the honest answer to "where is the road at 0.99" is the last place it
 * was seen rather than a line carried on into the gardens. */
export function roadAt(u) {
  if (u <= ROAD[0][0]) return ROAD[0][1];
  const last = ROAD[ROAD.length - 1];
  if (u >= last[0]) return last[1];
  for (let i = 1; i < ROAD.length; i += 1) {
    const [u0, v0] = ROAD[i - 1];
    const [u1, v1] = ROAD[i];
    if (u <= u1) return v0 + ((u - u0) / (u1 - u0)) * (v1 - v0);
  }
  return last[1];
}
