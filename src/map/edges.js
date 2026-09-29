/* The map's edges: a dark vignette, and nothing that moves.
 *
 * The reference has no border around its campaign map — the painting darkens as it
 * runs off the screen, which is what makes it read as a place rather than a picture
 * in a frame. This draws that: the map's own sides and the window's own top and
 * bottom fade into the art's outline ink over the last 72 pixels, in sixteen steps
 * rather than a gradient shader, because a banded rect is one draw call and the
 * banding is invisible under the fade.
 *
 * It hugs the *map's* sides rather than the window's: on a phone the column is the
 * window and the two are the same thing, and on a wide screen the margins beside
 * the map are the app's own frame, where a dark band would be a frame around the
 * page rather than an edge of the world. Its top and bottom follow the window, not
 * the world, so the fade stays at the edge of the screen while the map scrolls
 * under it.
 */
import { Container, Graphics } from '../../vendor/pixi/pixi.min.mjs';

const EDGE = { depth: 72, steps: 16, peak: 0.5, colour: 0x1d222b };

export function createEdges(parent, { left, width, height }) {
  const node = new Container();
  const shape = new Graphics();
  const step = EDGE.depth / EDGE.steps;
  for (let i = 0; i < EDGE.steps; i += 1) {
    const alpha = Number((EDGE.peak * (1 - i / EDGE.steps)).toFixed(3));
    const inset = i * step;
    shape.rect(inset, 0, step, height).fill({ color: EDGE.colour, alpha });
    shape.rect(width - inset - step, 0, step, height).fill({ color: EDGE.colour, alpha });
    shape.rect(0, inset, width, step).fill({ color: EDGE.colour, alpha });
    shape.rect(0, height - inset - step, width, step).fill({ color: EDGE.colour, alpha });
  }
  node.position.set(Math.round(left), 0);
  node.addChild(shape);
  /* The vignette is paint, not a control: without this a filled Graphics joins the
     hit test, and the two outer columns of the map stop answering taps — measured,
     a tap at x=68 or x=292 opened nothing while the same tap at x=180 opened the
     sheet. Nothing decorative on this map is interactive. */
  node.eventMode = 'none';
  parent.addChild(node);
  return { node, depth: EDGE.depth, peak: EDGE.peak, width, height };
}
