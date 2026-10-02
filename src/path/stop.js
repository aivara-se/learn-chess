/* One stop on the map, drawn — and the tap it answers.
 *
 * The illustration is the art's and lives in `src/map/marker.js`: the tower a
 * lesson wears, the medallion a detour wears, the boss crest, one overlay per
 * state on the medallion and the crest, and the golden arrow on the stop the
 * child is on. What is left here is what only this screen knows — the stop's
 * own words, which side of the marker they hang on, the row of stars, and the
 * two questions a tap asks: was this a pan, and is the stop open.
 *
 * Three things a reader should know.
 *
 * **The caption is written on the painting, so it wears a halo.** The map used to
 * be drawn on the app's own pale ground, where ink was enough; it is a painted
 * world now, and it is busy everywhere. Every word on a stop is the ink the kit
 * writes in with the art's own parchment `#efdfbb` around it — `ink` on that
 * parchment is 11.9:1 and the parchment on the darkest ground the painting has is
 * 13.9:1, so whichever ground a stop stands on, one of the pair carries the words.
 * That is the same two-tone rule the art card measured its sprites on, applied to
 * the app's text.
 *
 * **The caption hangs off what the marker really drew** (`box.top` / `box.bottom`),
 * not off a number beside it, so a marker drawn a little taller than the circle it
 * replaces cannot have its name written through it. The stars keep the place they
 * already had, between the name and the line. `side` is the layout's: a stop
 * standing off the road (a fork's branch) writes on the side it stands, so two
 * branches' captions cannot meet in the middle, and a stop on the road writes below
 * it. The stack is mirrored with the side, so the name is the line nearest the
 * marker either way.
 *
 * **The words are the kit's tiny tier, and the room is the layout's.** `caption` is
 * the width `src/path/layout.js` left this stop — the map's own edge on one side,
 * the world's far edge on the other, and half the distance to the nearest stop whose
 * ground it shares — so a caption is narrow where stops crowd and wide where they do
 * not. The longest name in the course wraps to three lines at the narrowest caption
 * the layout gives, which is what the layout reserves when it asks who shares ground.
 *
 * A tap is a tap, not a pan: the map moves under a finger, so the caller passes a
 * `panned()` test and a stop that was panned never counts as pressed. Pixi fires
 * `pointertap` on whatever the finger lifted over however far it travelled, so the
 * guard belongs here rather than in the gesture.
 *
 * The words are the caller's: this file draws a stop, it does not decide what a
 * stop says. `line` is the sentence under the name, `glyph` what an open stop wears.
 */
import { Container } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, TYPE, scale as clamped, text } from '../ui/theme.js';
import { createMarker, createStars } from '../map/marker.js';

const HALO = 0xefdfbb;  // the art's parchment, around the words the app writes

/* The app's text on the map, with the parchment behind its outline. `width` is the
 * halo's own size: 2px of parchment around a 12px line keeps the letterforms, and
 * 3px around the 12px name does the same — the name is the heavier of the two, and a
 * halo that swallowed the counters would cost more legibility than it bought. */
function captionText(string, { size, weight, colour, caption, halo = 3 }) {
  const node = text(string, { size, weight, colour, align: 'center', wrap: caption });
  node.style.stroke = { color: HALO, width: halo };
  return node;
}

export function createStop(parent, { stop, state, glyph, line, puzzles, here, caption, side = 'below', scale = 1, panned, onTap }) {
  const k = clamped(scale);
  const node = new Container();
  node.position.set(stop.x, stop.y);

  const marker = createMarker(node, { kind: stop.kind, state, here, glyph });

  /* The words, on the side the layout gave them: below the marker for a stop
   * standing on the road, above it for a stop standing off the road — a fork's two
   * branches write outwards, so their captions cannot meet in the middle and neither
   * one is written over the road the other branch stands off. The stack is mirrored
   * with it, so the name is always the line nearest the marker and the reading order
   * is the same either way. Everything is measured off the marker's own box, so a
   * marker drawn a little taller than the circle it replaces cannot have its name
   * written through it. */
  const gap = (n) => Math.round(n * k);
  const title = captionText(stop.title, {
    size: Math.round(TYPE.tiny * k),
    weight: '700',
    colour: COLOUR.ink,
    caption,
  });
  const stars = puzzles.of ? createStars(node, puzzles) : null;
  const sub = captionText(line, {
    size: Math.round(TYPE.tiny * k),
    weight: '500',
    colour: here ? COLOUR.ink : COLOUR.inkMute,
    caption,
    halo: 2,
  });

  let top;
  let bottom;
  if (side === 'above') {
    title.anchor.set(0.5, 1);
    title.position.set(0, marker.box.top - gap(6));
    let high = title.position.y - title.height;
    if (stars) {
      stars.node.position.set(0, high - gap(4) - stars.height);
      high = stars.node.position.y;
    }
    sub.anchor.set(0.5, 1);
    sub.position.set(0, high - gap(5));
    top = sub.position.y - sub.height;
    bottom = marker.box.bottom;
  } else {
    title.anchor.set(0.5, 0);
    title.position.set(0, marker.box.bottom + gap(6));
    let low = title.position.y + title.height;
    if (stars) {
      stars.node.position.set(0, low + gap(4));
      low += gap(4) + stars.height;
    }
    sub.anchor.set(0.5, 0);
    sub.position.set(0, low + gap(5));
    top = marker.box.top;
    bottom = sub.position.y + sub.height;
  }
  node.addChild(title);
  node.addChild(sub);

  /* The box is the ground the stop really asks for: the marker, the words on their
   * side of it, and the arrow when there is one. The width is what the words
   * really drew (`title.width`), not the width they were wrapped to, so a caption
   * that wrapped early does not claim ground it left empty. */
  const words = Math.round(Math.max(title.width, sub.width) / 2);
  const box = {
    left: Math.min(marker.box.left, -words),
    right: Math.max(marker.box.right, words),
    top,
    bottom,
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
