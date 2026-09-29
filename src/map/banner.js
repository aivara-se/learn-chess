/* The map's own banner: the star counter, in the art's wood-and-parchment plate.
 *
 * The art card drew the plate empty on purpose — every count on this screen is the
 * app's text — so the only thing this file does is put the two numbers the child
 * has earned where the plate left room for them, at the top-right of the map where
 * the reference keeps its counter.
 *
 * The numbers are `src/path/progress.js`'s: stars earned over the stars the course
 * has, with the denominator counted from the course rather than written down. The
 * plate's panel is parchment `#efdfbb`; the ink on it measures 11.9:1, the same
 * ink the rest of the game writes in.
 */
import { Container } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, text } from '../ui/theme.js';
import { MAP, sprite } from '../ui/assets.js';

/* The plate's drawn size and where its empty panel is, read off the art's own
 * source (`assets/source/map/banner-star-counter.svg`): the parchment is the path
 * from (62,22) to (298,56) of the 360×78 plate. */
export const BANNER = { width: 360, height: 78, panel: { x: 62, y: 22, width: 236, height: 34 } };

export function createBanner(parent, { x, y, width, stars, of }) {
  const k = width / BANNER.width;
  const node = new Container();
  /* A readout, not a control: the plate sits on the header's curtain, and the
     curtain is what eats a tap that reaches it. */
  node.eventMode = 'none';
  node.position.set(Math.round(x), Math.round(y));

  const plate = sprite(MAP.banner, { width, height: Math.round(BANNER.height * k) });
  node.addChild(plate);

  const panel = {
    x: Math.round(BANNER.panel.x * k),
    y: Math.round(BANNER.panel.y * k),
    width: Math.round(BANNER.panel.width * k),
    height: Math.round(BANNER.panel.height * k),
  };
  const counter = text(`${stars}/${of}`, { size: Math.round(17 * k), weight: '700', colour: COLOUR.ink, align: 'center' });
  counter.anchor.set(0.5);
  counter.position.set(panel.x + Math.round(panel.width / 2), panel.y + Math.round(panel.height / 2));
  node.addChild(counter);

  parent.addChild(node);
  return {
    node,
    counter,
    stars,
    of,
    width,
    height: Math.round(BANNER.height * k),
    /* What the plate really says, for a check: the same read the child gets. */
    read: () => counter.text,
  };
}
