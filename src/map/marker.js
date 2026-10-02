/* One stop's marker, drawn in the art's own vocabulary.
 *
 * A lesson wears the operator's tower in the state it is in — open, done or
 * locked — and the tower is the whole marker: no overlay sits on it. The
 * medallion a detour wears, the boss crest, the gold star for a star earned and
 * the golden arrow for the stop the child is on are the art's as before. This
 * file places them; it does not decide anything the screen knows — the kind,
 * the state and the stars are the caller's, and the words stay in
 * `src/path/stop.js` with the rest of the stop's caption.
 *
 * Three things a reader should know:
 *
 *   - **The marker is drawn about the stop's own point.** A lesson's tower is
 *     64×96, so it stands 48px above and below the point the layout gives the
 *     stop and its caption starts below that.
 *   - **A state overlay is the medallion's box scaled to the marker it sits
 *     on.** The three overlays were drawn over the 64×72 shield the tower
 *     replaces; the medallion is 48×54 and the boss crest 64×72, so the overlay
 *     is scaled by the marker's own height and centred on it. That keeps the
 *     ring, the padlock and the tick on the face they were measured on rather
 *     than beside it.
 *   - **The arrow points down.** The card asks for "the golden downward arrow above
 *     it" and the art shipped one pointing up, so the sprite is drawn mirrored on
 *     its own centre — the only place this screen turns a piece of the art, and it
 *     is named on the pull request with the finding on the art card.
 */
import { Container, Graphics, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR } from '../ui/theme.js';
import { MAP, sprite } from '../ui/assets.js';

/* The art's drawn sizes, read off each entry's `source` line in
 * `assets/manifest.json` — the manifest is the record, and the art card decided
 * the numbers. */
export const MARKER = {
  lesson: { asset: null, width: 64, height: 96, pole: false, tower: true },
  pack: { asset: MAP.medallion, width: 48, height: 54, pole: false },
  /* The crest is drawn at the tower's own width where the art shipped it at 76:
   * the crest is the last stop before the bridge and ten stops have to fit in the
   * road west of it, so a marker wider than the step would be drawn over its
   * neighbour. `src/path/layout.js` holds the rule and says why. */
  boss: { asset: MAP.boss, width: 64, height: 72, pole: false },
};
export const TOWER_FOR = { done: MAP.towerDone, open: MAP.towerOpen, locked: MAP.towerLocked };
export const OVERLAY = { width: 64, height: 72 };
export const ARROW = { width: 30, height: 36, gap: 4 };

const OVERLAY_FOR = { done: MAP.done, open: MAP.open, locked: MAP.locked };

/* The marker for one stop. Returns the node (its origin is the stop's own point),
 * the face's own box, the arrow when this is the stop the child is on, and the
 * rectangle a finger gets. It draws no text: the lesson's number is the only word
 * on the map and `src/path/stop.js` writes it under the marker, where every stop's
 * words used to hang. */
export function createMarker(parent, { kind = 'lesson', state = 'locked', here = false }) {
  const shape = MARKER[kind] ?? MARKER.lesson;
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;
  const node = new Container();

  const face = sprite(shape.tower ? (TOWER_FOR[state] ?? TOWER_FOR.locked) : shape.asset, { width: shape.width, height: shape.height });
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

  /* A lesson's state is the tower itself, so it wears no overlay. The medallion
   * and the crest below keep the one the art drew for them. */
  if (!shape.tower) {
    const overlay = sprite(OVERLAY_FOR[state] ?? OVERLAY_FOR.locked, {
      width: Math.round((shape.height / OVERLAY.height) * OVERLAY.width),
      height: shape.height,
    });
    overlay.position.set(-overlay.width / 2, -halfH);
    node.addChild(overlay);
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
