/* The painting's own numbers: its size, and the road it draws.
 *
 * The map is one painting (`assets/map/world.jpg`, the operator's own) and the
 * stops do not float on it — they stand on the road it drew. That is only true if
 * the road's own course is written down somewhere, so it is here: the road's centre
 * as a share of the painting's height, sampled left to right.
 *
 * **Where these numbers came from, and why the earlier method could not find them.**
 * They are read off a copy of the painting the operator marked himself: the road
 * painted flat `#FF0000` from edge to edge, mailed to `mama@aivara.se`. That is the
 * eye this trace always needed. The rule this file used to record — read each column
 * for the tan of packed dirt, keep the run nearest the column before it — was re-run
 * against this painting and is not usable on it: a packed-dirt road, a ploughed
 * field, a fence line and a dirt patch are all the same brown, and a tightened
 * road-shaped rule wandered by ±100px. Against the red there is no guesswork: the
 * stroke is 28–44px wide at the marked copy's 3168×1344 and stays inside that band
 * across the whole frame, which is what says one road was followed and not a field.
 *
 * The marking also settled the shape of the swap. This painting's road runs
 * diagonally — 0.93 of the height at the left edge, down to 0.45 across the middle,
 * back up to 0.65 at the right — where the previous painting's road undulated around
 * 0.50. The two agree nowhere: the old table is wrong here by up to 0.44 of the
 * height, about 282px at a 640-tall window, which is the difference between a stop
 * standing on the road and a stop standing in a field. So the painting and this table
 * replaced each other in one change, and neither shipped without the other.
 *
 * A value here is a share of the painting's height, not a pixel: the world is drawn
 * at whatever scale covers the window, so a y in pixels is a fact about one window
 * and a share of the height is a fact about the painting.
 */

/* The painting's own pixels. It ships as sent — no cut, no grid — so this is simply
 * the file's size, and `src/map/terrain.js` draws it at the scale that covers the
 * window. A y in the world is a share of this height times that scale, never a pixel
 * of a window. */
export const WORLD = { width: 1584, height: 672 };

/* `[u, v]`: u across the painting (0 left, 1 right), v its road's centre as a share
 * of the height. Every sixteenth, from a little inside the left edge to the right:
 * the marking has no stroke in the leftmost column — the road's own left end begins
 * around u 0.06 — so the table begins where the road does rather than inventing a
 * sample at 0. */
export const ROAD = [
  [0.0625, 0.926], [0.125, 0.831], [0.1875, 0.716], [0.25, 0.653],
  [0.3125, 0.637], [0.375, 0.452], [0.4375, 0.452], [0.5, 0.522],
  [0.5625, 0.522], [0.625, 0.593], [0.6875, 0.643], [0.75, 0.642],
  [0.8125, 0.635], [0.875, 0.653], [0.9375, 0.647],
];

/* The stretch of the painting the stops span, in `u`. It starts a little inside the
 * left edge — a stop's caption is centred on it and would otherwise be half off the
 * world. Its far end is the stop line, not the road's: the painting's bridge
 * crosses the river at u 0.49–0.54 (read off the shipped art), so the line ends
 * at 0.46 and the last lesson stands before the bridge, with no stop drawn on
 * the deck or in the water. The road table itself still runs to the last place
 * the road is really there. */
export const SPAN = { from: 0.055, to: 0.46 };

/* The road's centre at `u`, as a share of the painting's height. Straight lines
 * between the samples, clamped at both ends — past the table the honest answer to
 * "where is the road at 0.99" is the last place it was seen rather than a line
 * carried on past the marking. */
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
