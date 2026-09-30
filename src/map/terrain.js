/* The ground the map is drawn on: one painting, edge to edge, wider than the pane.
 *
 * The painting is the operator's own (`assets/map/world.png` — one file, cut to a
 * 640×272 pixel grid at 40 colours) and it is the whole world: there are no terrains
 * stitched out of slices any more, so there is no seam to place and no band a stop
 * has to stay inside.
 *
 * **The fit is a cover, and that is what makes the map pan.** The painting is
 * 2.353:1 and a phone is nothing like it, so it is drawn at the larger of the two
 * ratios — `max(window/640, window/272)` — which fills the window in both directions
 * and leaves the world wider than the pane at every window shape. Nothing shows round
 * it: no letterbox bar, no ground colour at the sides. What it costs is that only
 * part of the world is on screen at once, which is the pan the screen draws
 * (`src/scenes/path.js`), and it is why the pan is real rather than decorative.
 *
 * The two answers this file does not give: where the road runs (`src/map/road.js`,
 * measured off this painting) and where the stops stand (`src/path/layout.js`).
 */

import { Container } from '../../vendor/pixi/pixi.min.mjs';
import { MAP, sprite } from '../ui/assets.js';
import { WORLD } from './road.js';

export { WORLD };

/* The painting is a pixel grid magnified — 2.4× on a phone — so its own pixels stay
 * square and hard-edged rather than being smoothed into a photograph of themselves.
 * That is the whole reason the cut is quantised to a grid and not shipped as the
 * operator's webp. */
const IMAGE = 'nearest';

/* The scale that covers a window, and the size the painting is drawn at. The drawn
 * size is rounded up: a cover that rounds down leaves a pixel of ground showing at
 * the far edge, which is exactly what this card says must not happen. */
export function coverFit({ width, height }) {
  const scale = Math.max(width / WORLD.width, height / WORLD.height);
  return { scale, width: Math.ceil(WORLD.width * scale), height: Math.ceil(WORLD.height * scale) };
}

/* How far the world may be panned: what it has that the window has not. The cover
 * leaves one direction with room and the other with none, at every window shape a
 * phone or a laptop has — a painting wider than every one of them. */
export function panRange({ width, height }, fit) {
  return { x: Math.max(0, fit.width - width), y: Math.max(0, fit.height - height) };
}

/* The ground, drawn at the fit and nothing else. `parent` is the map's world
 * container, so the ground moves with the stops that stand on it. */
export function createTerrain(parent, { fit }) {
  const node = new Container();
  /* Paint, not a control: the ground must never be in the hit test, or a tap on a
   * stop would land on the painting under it. */
  node.eventMode = 'none';
  const image = sprite(MAP.world, { width: fit.width, height: fit.height });
  image.position.set(0, 0);
  if (image.texture?.source) image.texture.source.scaleMode = IMAGE;
  node.addChild(image);
  parent.addChild(node);
  return { node, image, scale: fit.scale, drawn: { x: 0, y: 0, width: fit.width, height: fit.height } };
}
