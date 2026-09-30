/* The ground the map is drawn on: one painted world, cut into three bands and
 * stitched back together by placing them where they were cut.
 *
 * The art card painted a single 520×1280 world and exported three slices of it at
 * 2× (the meadow, the rocky pass, the dark end). They are placed here at those cut
 * rows and at no others: the pixels either side of a join are the same pixels, so
 * a seam cannot show. The one way to put a stop on ground the painting never gave
 * it is to *wrap* a band against a row of the layout — the painting's own rows are
 * `66 + 152·depth` and `src/path/layout.js` derives the same rows, which is how a
 * stop's depth in the `requires` graph decides the region it stands in.
 *
 * **The viewport can be narrower than the world.** The map's column is
 * `min(window, 520)` and the painting is 520 wide, so on a phone the world is drawn
 * at the column's width and 1:1 vertically. That keeps both things the screen
 * cannot give up: the rows start where the painting painted them (a uniform scale
 * would slide the ash front across the two branches of row 5 and leave the last row
 * with no ground under it — and `src/path/place.js` may open a row within its band,
 * never across a band's edge, so the regions still are the course), and the stops and
 * captions keep the sizes the port contract measured. What it costs is a horizontal squeeze below 520 — the props
 * are 69% of their width at 360 — and the alternative, cropping, was measured and
 * rejected: it cuts the outer stops' captions in half and moves the ash front under
 * the wrong branch. The card leaves this call to the screen and the pull request
 * says which was taken and why.
 */
import { Container } from '../../vendor/pixi/pixi.min.mjs';
import { MAP, sprite } from '../ui/assets.js';

/* The painting's own size, and the rows the art card cut it at. Each band's drawn
 * height is half its exported file (the export is 2×): 892, 888 and 780 pixels of
 * PNG become 446, 444 and 390 pixels of map. */
export const WORLD = { width: 520, height: 1280 };

export const BANDS = [
  { id: 'meadow', asset: MAP.meadow, y: 0, height: 446, region: 'Meadow and village' },
  { id: 'pass', asset: MAP.pass, y: 446, height: 444, region: 'Mountain pass' },
  { id: 'ash', asset: MAP.ash, y: 890, height: 390, region: 'The dark end' },
];

/* Which band a point on the map is standing on. The course decides a stop's region
 * by its depth in the `requires` graph; the painting is what makes that true, and
 * this is the reader a check uses to hold the two together — `tests/map.test.ts`
 * walks every stop the layout places and asks whether its row is in the band its
 * region names. */
export function bandAt(y) {
  return BANDS.find((band) => y >= band.y && y < band.y + band.height) ?? BANDS[BANDS.length - 1];
}

/* The ground, drawn at the column's width. `parent` is the map's world container,
 * so the ground scrolls with the stops that stand on it. */
export function createTerrain(parent, { width }) {
  const node = new Container();
  /* Paint, not a control: the ground must never be in the hit test, or a tap on a
     stop would land on the painting under it. */
  node.eventMode = 'none';
  const bands = BANDS.map((band) => {
    const image = sprite(band.asset, { width, height: band.height });
    image.position.set(0, band.y);
    node.addChild(image);
    return { ...band, drawn: { x: 0, y: band.y, width, height: band.height } };
  });
  parent.addChild(node);
  return { node, width, bands, height: WORLD.height };
}
