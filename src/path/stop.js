/* One stop on the map, drawn — and the tap it answers.
 *
 * The illustration is the art's and lives in `src/map/marker.js`: the shield a
 * lesson wears, the medallion a detour wears, the boss crest, the pole behind the
 * shield, one overlay per state and the golden arrow on the stop the child is on.
 * What is left here is what only this screen knows — the stop's own words, where
 * its caption sits under its marker, the row of stars, Pip standing where the child
 * is, and the two questions a tap asks: was this a drag, and is the stop open.
 *
 * Two things a reader should know.
 *
 * **The caption is written on the painting, so it wears a halo.** The map used to
 * be drawn on the app's own pale ground, where ink was enough; it is a painted
 * world now, and the dark end is dark. Every word under a stop is the ink the kit
 * writes in with the art's own parchment `#efdfbb` around it — `ink` on that
 * parchment is 11.9:1 and the parchment on the darkest ash is 13.9:1, so whichever
 * ground a stop stands on, one of the pair carries the words. That is the same
 * two-tone rule the art card measured its sprites on, applied to the app's text.
 *
 * **The caption hangs off what the marker really drew** (`box.bottom`), not off a
 * number beside it, so a marker drawn a little taller than the circle it replaces
 * cannot have its name written through it. The stars keep the place they already
 * had, between the name and the line: the map's rows are 152px apart and a row
 * under the *marker* would push every caption into the marker below it — measured,
 * the deepest caption already reaches 132px below its stop at 360px wide while the
 * next row's marker starts 116px below it.
 *
 * A tap is a tap, not a drag: the map moves under a finger, so the caller passes a
 * `panned()` test and a stop that was scrolled never counts as pressed. Pixi fires
 * `pointertap` on whatever the finger lifted over however far it travelled, so the
 * guard belongs here rather than in the gesture.
 *
 * The words are the caller's: this file draws a stop, it does not decide what a
 * stop says. `line` is the sentence under the name, `glyph` what an open stop wears.
 */
import { Container } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, TYPE, scale as clamped, text } from '../ui/theme.js';
import { SPRITE, sprite } from '../ui/assets.js';
import { createMarker, createStars } from '../map/marker.js';

const PIP = 36;         // Pip, standing where the child is
const PIP_LIFT = 14;    // how far above the circle he stands
const HALO = 0xefdfbb;  // the art's parchment, around the words the app writes

/* The app's text on the map, with the parchment behind its outline. `width` is the
 * halo's own size: 2px of parchment around a 12px line keeps the letterforms, and
 * 3px around a 13.5px name does the same — a halo that swallowed the counters would
 * cost more legibility than it bought. */
function captionText(string, { size, weight, colour, caption, halo = 3 }) {
  const node = text(string, { size, weight, colour, align: 'center', wrap: caption });
  node.style.stroke = { color: HALO, width: halo };
  return node;
}

export function createStop(parent, { stop, state, glyph, line, puzzles, here, caption, room = 0, scale = 1, panned, onTap }) {
  const k = clamped(scale);
  const node = new Container();
  node.position.set(stop.x, stop.y);

  const marker = createMarker(node, { kind: stop.kind, state, here, glyph });
  const halfW = marker.face.width / 2;

  /* Pip stands where the child is, on the side the map has room for: in the last
   * column his 36px would otherwise hang past the edge of the map and be cut in
   * half. The arrow above the marker says the same thing in the art's own voice. */
  const pip = Math.round(PIP * k);
  const pipRight = room >= halfW + Math.round(2 * k) + pip;
  if (here) {
    const mark = sprite(SPRITE.pip, { width: pip, height: pip });
    mark.position.set(pipRight ? halfW + Math.round(2 * k) : -(halfW + Math.round(2 * k) + pip), -Math.round(PIP_LIFT * k) - pip);
    node.addChild(mark);
  }

  const title = captionText(stop.title, {
    size: Math.round((stop.kind === 'pack' ? TYPE.tiny : TYPE.small) * k),
    weight: '700',
    colour: COLOUR.ink,
    caption,
  });
  title.anchor.set(0.5, 0);
  title.position.set(0, marker.box.bottom + Math.round(6 * k));
  node.addChild(title);
  let low = title.position.y + title.height;

  if (puzzles.of) {
    const row = createStars(node, puzzles);
    row.node.position.set(0, low + Math.round(4 * k));
    low += Math.round(4 * k) + row.height;
  }

  const sub = captionText(line, {
    size: Math.round(TYPE.tiny * k),
    weight: '500',
    colour: here ? COLOUR.ink : COLOUR.inkMute,
    caption,
    halo: 2,
  });
  sub.anchor.set(0.5, 0);
  sub.position.set(0, low + Math.round(5 * k));
  node.addChild(sub);

  const box = {
    left: Math.min(marker.box.left, -Math.round(caption / 2), here && !pipRight ? -(halfW + Math.round(2 * k) + pip) : 0),
    right: Math.max(marker.box.right, Math.round(caption / 2), here && pipRight ? halfW + Math.round(2 * k) + pip : 0),
    top: here ? Math.min(marker.box.top, -Math.round(PIP_LIFT * k) - pip) : marker.box.top,
    bottom: sub.position.y + sub.height,
  };

  node.eventMode = 'static';
  node.hitArea = marker.hit;
  node.cursor = 'pointer';
  node.on('pointertap', () => { if (!panned()) onTap(stop); });

  parent.addChild(node);
  return {
    node,
    id: stop.id,
    kind: stop.kind,
    state,
    title: stop.title,
    line,
    stars: puzzles,
    arrow: marker.arrow,
    /* The name the shell's live region is handed when a stop is tapped: the canvas
     * is one node, so a stop has to say what it is out loud. */
    spoken: () => `${stop.title}: ${line}`,
    box,
    /* The hit area is what a finger gets, and it is the marker's own box: the
     * caption belongs to the stop but is not something a child taps. */
    measure: () => ({ id: stop.id, kind: stop.kind, state, title: stop.title, line, stars: puzzles, here, x: stop.x, y: stop.y, width: marker.hit.width, height: marker.hit.height, box }),
  };
}
