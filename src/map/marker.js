/* One stop's marker, drawn in the art's own vocabulary.
 *
 * The art card drew a marker set and no text: the shield a lesson wears, the
 * medallion a detour wears, the boss crest, the pole and pennant behind a shield,
 * one overlay per state, the gold star for a star earned and the golden arrow for
 * the stop the child is on. This file places them; it does not decide anything the
 * screen knows — the kind, the state and the stars are the caller's, and the words
 * stay in `src/path/stop.js` with the rest of the stop's caption.
 *
 * Three things a reader should know:
 *
 *   - **The marker is drawn about the stop's own point.** A lesson's shield is
 *     64×72, so it stands 36px above and below the point the layout gives the stop
 *     and its caption starts below that; the pole is drawn first, behind the shield,
 *     with its base on the marker's bottom edge, which is where the art puts it.
 *   - **A state overlay is the shield's box scaled to the marker it sits on.** The
 *     three overlays were drawn over the 64×72 shield; the medallion is 48×54 and
 *     the boss crest 76×84, so the overlay is scaled by the marker's own height and
 *     centred on it. That keeps the ring, the padlock and the tick on the face they
 *     were measured on rather than beside it.
 *   - **The arrow points down.** The card asks for "the golden downward arrow above
 *     it" and the art shipped one pointing up, so the sprite is drawn mirrored on
 *     its own centre — the only place this screen turns a piece of the art, and it
 *     is named on the pull request with the finding on the art card.
 */
import { Container, Graphics, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, text } from '../ui/theme.js';
import { MAP, sprite } from '../ui/assets.js';

/* The art's drawn sizes, read off each entry's `source` line in
 * `assets/manifest.json` — the manifest is the record, and the art card decided
 * the numbers. */
export const MARKER = {
  lesson: { asset: MAP.shield, width: 64, height: 72, pole: true },
  pack: { asset: MAP.medallion, width: 48, height: 54, pole: false },
  boss: { asset: MAP.boss, width: 76, height: 84, pole: false },
};
export const POLE = { asset: MAP.pole, width: 20, height: 52 };
export const OVERLAY = { width: 64, height: 72 };
export const STAR = { size: 22, gap: 2 };
export const ARROW = { width: 30, height: 36, gap: 4 };

const OVERLAY_FOR = { done: MAP.done, open: MAP.open, locked: MAP.locked };

/* The marker for one stop. Returns the node (its origin is the stop's own point),
 * the face's own box so the caption can hang from it, the arrow when this is the
 * stop the child is on, and the rectangle a finger gets. `glyph` is the app's own
 * text for the stop's face — the art ships no numeral, and the open stop still
 * wears the lesson's number so the caption "after lesson 3" has something to point
 * at. It is drawn last, over the state overlay. */
export function createMarker(parent, { kind = 'lesson', state = 'locked', here = false, glyph = '' }) {
  const shape = MARKER[kind] ?? MARKER.lesson;
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;
  const node = new Container();

  if (shape.pole) {
    const pole = sprite(POLE.asset, { width: POLE.width, height: POLE.height });
    pole.position.set(-Math.round(POLE.width / 2), halfH - POLE.height);
    node.addChild(pole);
  }

  const face = sprite(shape.asset, { width: shape.width, height: shape.height });
  face.position.set(-halfW, -halfH);
  node.addChild(face);

  if (kind === 'pack') {
    /* A detour is not a stop on the path, and its dotted edge says so before a child
     * reads the word "optional" underneath. The art card drew no detour-specific
     * sprite beyond the medallion and left this ring to the code; it is drawn about
     * the medallion's own disc, which sits 3px above the middle of its box. */
    const ring = new Graphics();
    const radius = halfW + 4;
    for (let step = 0; step < 12; step += 1) {
      const angle = (step / 12) * Math.PI * 2;
      ring.circle(Math.cos(angle) * radius, Math.sin(angle) * radius - Math.round(shape.height * 0.055), 1.6).fill(COLOUR.inkMute);
    }
    node.addChild(ring);
  }

  const overlay = sprite(OVERLAY_FOR[state] ?? OVERLAY_FOR.locked, {
    width: Math.round((shape.height / OVERLAY.height) * OVERLAY.width),
    height: shape.height,
  });
  overlay.position.set(-overlay.width / 2, -halfH);
  node.addChild(overlay);

  /* The number the open stop wears, over the overlay rather than under it: the art's
   * open overlay is a glow across the middle of the badge, and the shipped PNG's
   * glow is opaque (measured: the marker's centre pixel comes back as the glow's own
   * `#ffdf88`, with no partial alpha anywhere in the file), so a number beneath it
   * is a number nobody reads. The art card ships no numerals by design — every count
   * on this screen is the app's text — so the lesson's number is drawn here, in ink
   * on the glow: `#182046` on `#ffdf88` is 12.1:1. */
  if (state === 'open' && glyph) {
    const number = text(glyph, { size: Math.round(shape.height * 0.28), weight: '700', colour: COLOUR.ink });
    number.anchor.set(0.5);
    number.position.set(0, -Math.round(shape.height * 0.085));
    node.addChild(number);
  }

  let arrow = null;
  if (here) {
    arrow = sprite(MAP.arrow, { width: ARROW.width, height: ARROW.height });
    arrow.anchor.set(0.5);
    /* Mirrored on the sprite's own centre: the tip points at the stop, which is the
     * only thing the child reads off it. The sign is flipped rather than the scale
     * written, because `sprite()` set this axis to `ARROW.height / texture height`
     * (the art is exported at 2×) and `scale.y = -1` would throw that away — the
     * arrow would draw at the texture's own height, twice the size `ARROW.height`
     * names, and its tip would land inside the stop's crown. */
    arrow.scale.y *= -1;
    arrow.position.set(0, -halfH - ARROW.gap - ARROW.height / 2);
    node.addChild(arrow);
  }

  parent.addChild(node);
  return {
    node,
    arrow,
    kind,
    state,
    face: { width: shape.width, height: shape.height },
    box: {
      left: -halfW,
      right: halfW,
      top: arrow ? -halfH - ARROW.gap - ARROW.height : -halfH,
      bottom: halfH,
    },
    hit: new Rectangle(-halfW, -halfH, shape.width, shape.height),
  };
}

/* The row of stars under a stop: one per puzzle the stop has, the ones earned in
 * the art's gold and the ones still to get ghosted, so the row still says *how
 * many of how many* the way the drawn one did. The row's own count in words is the
 * caption's line, which is why a ghosted slot is legible enough — nothing on this
 * map is carried by a shade alone. */
export function createStars(parent, { of = 0, stars = 0 }) {
  const node = new Container();
  if (!of) return { node, width: 0, height: 0 };
  const width = of * STAR.size + (of - 1) * STAR.gap;
  let x = -width / 2;
  for (let i = 0; i < of; i += 1) {
    const star = sprite(MAP.star, { width: STAR.size, height: STAR.size });
    if (i >= stars) {
      star.alpha = 0.32;
      star.tint = COLOUR.mute;
    }
    star.position.set(Math.round(x), 0);
    node.addChild(star);
    x += STAR.size + STAR.gap;
  }
  parent.addChild(node);
  return { node, width, height: STAR.size };
}
